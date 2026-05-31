import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { CreateTimetableInput, UpdateTimetableInput } from "./timetable.schema";

const timetableInclude = {
  class: { select: { id: true, name: true, level: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
};

// Day order for sorting weekly schedule naturally
const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export const timetableService = {
  async create(schoolId: string, input: CreateTimetableInput) {
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime } = input;

    // Verify all references belong to this school
    const [cls, subject, teacher] = await Promise.all([
      prisma.class.findFirst({ where: { id: classId, schoolId } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.teacher.findFirst({ where: { id: teacherId, schoolId } }),
    ]);

    if (!cls) throw new AppError("Class not found.", 404, "NOT_FOUND");
    if (!subject) throw new AppError("Subject not found.", 404, "NOT_FOUND");
    if (!teacher) throw new AppError("Teacher not found.", 404, "NOT_FOUND");

    // Verify subject belongs to this class
    if (subject.classId !== classId) {
      throw new AppError(
        "This subject does not belong to the specified class.",
        400,
        "SUBJECT_CLASS_MISMATCH"
      );
    }

    // Check for class time slot conflict (unique constraint will catch duplicates,
    // but we give a better error message here)
    const classConflict = await prisma.timetable.findUnique({
      where: { classId_dayOfWeek_startTime: { classId, dayOfWeek, startTime } },
    });
    if (classConflict) {
      throw new AppError(
        `${cls.name} already has a subject scheduled on ${dayOfWeek} at ${startTime}.`,
        409,
        "TIME_SLOT_TAKEN"
      );
    }

    return prisma.timetable.create({
      data: { schoolId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime },
      include: timetableInclude,
    });
  },

  /**
   * Full weekly timetable for a class — grouped by day for easy rendering.
   */
  async getClassTimetable(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new AppError("Class not found.", 404, "NOT_FOUND");

    const entries = await prisma.timetable.findMany({
      where: { schoolId, classId },
      include: timetableInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Group by day for a structured weekly view
    const grouped = DAY_ORDER.reduce(
      (acc, day) => {
        acc[day] = entries
          .filter((e) => e.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return acc;
      },
      {} as Record<string, typeof entries>
    );

    return {
      class: { id: cls.id, name: cls.name, level: cls.level },
      timetable: grouped,
      totalPeriods: entries.length,
    };
  },

  /**
   * Full weekly schedule for a teacher across all their classes.
   */
  async getTeacherTimetable(schoolId: string, teacherId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!teacher) throw new AppError("Teacher not found.", 404, "NOT_FOUND");

    const entries = await prisma.timetable.findMany({
      where: { schoolId, teacherId },
      include: timetableInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    const grouped = DAY_ORDER.reduce(
      (acc, day) => {
        acc[day] = entries
          .filter((e) => e.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return acc;
      },
      {} as Record<string, typeof entries>
    );

    return {
      teacher: {
        id: teacher.id,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      },
      timetable: grouped,
      totalPeriods: entries.length,
    };
  },

  async update(schoolId: string, entryId: string, input: UpdateTimetableInput) {
    const entry = await prisma.timetable.findFirst({
      where: { id: entryId, schoolId },
    });
    if (!entry) throw new AppError("Timetable entry not found.", 404, "NOT_FOUND");

    if (input.teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: { id: input.teacherId, schoolId },
      });
      if (!teacher) throw new AppError("Teacher not found.", 404, "NOT_FOUND");
    }

    return prisma.timetable.update({
      where: { id: entryId },
      data: input,
      include: timetableInclude,
    });
  },

  async delete(schoolId: string, entryId: string) {
    const entry = await prisma.timetable.findFirst({
      where: { id: entryId, schoolId },
    });
    if (!entry) throw new AppError("Timetable entry not found.", 404, "NOT_FOUND");
    await prisma.timetable.delete({ where: { id: entryId } });
  },
};

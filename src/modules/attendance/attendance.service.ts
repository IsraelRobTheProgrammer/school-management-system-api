import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import {
  RecordAttendanceInput,
  UpdateAttendanceInput,
  AttendanceQuery,
} from "./attendance.schema";

export const attendanceService = {
  /**
   * Records attendance for an entire class on a given date.
   * Uses upsert so re-submitting for the same date updates existing records
   * rather than throwing a duplicate error — teachers can correct mistakes.
   */
  async record(schoolId: string, input: RecordAttendanceInput) {
    const { classId, date, records } = input;

    // Verify class belongs to this school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!cls) throw new AppError("Class not found.", 404, "NOT_FOUND");

    // Verify all students belong to this school and this class
    const studentIds = records.map((r) => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId, classId },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      throw new AppError(
        "One or more students do not belong to this class.",
        400,
        "INVALID_STUDENTS",
      );
    }

    const attendanceDate = new Date(date);

    // Upsert each record — idempotent, teachers can re-submit corrections
    const upserts = records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_classId_date: {
            studentId: record.studentId,
            classId,
            date: attendanceDate,
          },
        },
        create: {
          schoolId,
          classId,
          studentId: record.studentId,
          date: attendanceDate,
          status: record.status,
          note: record.note,
        },
        update: {
          status: record.status,
          note: record.note,
        },
      }),
    );

    const results = await prisma.$transaction(upserts);

    return {
      date,
      classId,
      className: cls.name,
      totalRecorded: results.length,
      summary: {
        present: results.filter((r) => r.status === "PRESENT").length,
        absent: results.filter((r) => r.status === "ABSENT").length,
        late: results.filter((r) => r.status === "LATE").length,
        excused: results.filter((r) => r.status === "EXCUSED").length,
      },
    };
  },

  /**
   * Query attendance records.
   * Supports: by class+date, by student+dateRange, or combinations.
   */
  async findMany(schoolId: string, query: AttendanceQuery) {
    const { classId, studentId, date, startDate, endDate } = query;

    if (!classId && !studentId) {
      throw new AppError(
        "Please provide at least classId or studentId as a query parameter.",
        400,
        "MISSING_FILTER",
      );
    }

    const dateFilter = date
      ? { date: new Date(date) }
      : startDate && endDate
        ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
        : {};

    return prisma.attendance.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        ...(studentId ? { studentId } : {}),
        ...dateFilter,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { student: { user: { lastName: "asc" } } }],
    });
  },

  /**
   * Update a single attendance record by ID.
   * Teachers can correct a wrong status after submission.
   */
  async update(
    schoolId: string,
    attendanceId: string,
    input: UpdateAttendanceInput,
  ) {
    const record = await prisma.attendance.findFirst({
      where: { id: attendanceId, schoolId },
    });
    if (!record)
      throw new AppError("Attendance record not found.", 404, "NOT_FOUND");

    return prisma.attendance.update({
      where: { id: attendanceId },
      data: input,
    });
  },

  /**
   * Attendance summary for a student — useful for the student/parent portal.
   * Returns total days, days present, and attendance percentage.
   */
  async getStudentSummary(
    schoolId: string,
    studentId: string,
    // academicYear?: string,
    // term?: string
  ) {
    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");

    // Build date range filter from academic year if provided
    // Nigerian school year: Sept–Aug roughly, but we'll filter by term dates
    // For simplicity, we fetch all and let the frontend filter by term if needed
    const records = await prisma.attendance.findMany({
      where: { schoolId, studentId },
      select: { status: true, date: true },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
      },
      summary: {
        totalDays: total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: percentage,
      },
    };
  },
};

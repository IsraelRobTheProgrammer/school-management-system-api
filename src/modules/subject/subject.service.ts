import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { CreateSubjectInput, UpdateSubjectInput } from "./subject.schema";

export const subjectService = {
  async create(schoolId: string, input: CreateSubjectInput) {
    // Verify class belongs to this school
    const cls = await prisma.class.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!cls) {
      throw new AppError("Class not found.", 404, "NOT_FOUND");
    }

    // Enforce unique subject name per class per school
    const existing = await prisma.subject.findUnique({
      where: {
        schoolId_classId_name: {
          schoolId,
          classId: input.classId,
          name: input.name,
        },
      },
    });
    if (existing) {
      throw new AppError(
        `Subject "${input.name}" already exists in this class.`,
        409,
        "SUBJECT_EXISTS"
      );
    }

    return prisma.subject.create({
      data: { schoolId, ...input },
      include: { class: { select: { id: true, name: true, level: true } } },
    });
  },

  async findAll(schoolId: string, classId?: string) {
    return prisma.subject.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
      },
      include: { class: { select: { id: true, name: true, level: true } } },
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    });
  },

  async findById(schoolId: string, subjectId: string) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      include: { class: { select: { id: true, name: true, level: true } } },
    });
    if (!subject) throw new AppError("Subject not found.", 404, "NOT_FOUND");
    return subject;
  },

  async update(schoolId: string, subjectId: string, input: UpdateSubjectInput) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
    if (!subject) throw new AppError("Subject not found.", 404, "NOT_FOUND");

    // Check new name won't conflict within the same class
    if (input.name && input.name !== subject.name) {
      const conflict = await prisma.subject.findUnique({
        where: {
          schoolId_classId_name: {
            schoolId,
            classId: subject.classId,
            name: input.name,
          },
        },
      });
      if (conflict) {
        throw new AppError(
          `Subject "${input.name}" already exists in this class.`,
          409,
          "SUBJECT_EXISTS"
        );
      }
    }

    return prisma.subject.update({
      where: { id: subjectId },
      data: input,
      include: { class: { select: { id: true, name: true, level: true } } },
    });
  },

  async delete(schoolId: string, subjectId: string) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
    if (!subject) throw new AppError("Subject not found.", 404, "NOT_FOUND");

    await prisma.subject.delete({ where: { id: subjectId } });
  },
};

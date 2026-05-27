import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { CreateClassInput, UpdateClassInput } from "./class.schema";

export const classService = {
  async create(schoolId: string, input: CreateClassInput) {
    // Enforce uniqueness per tenant: same school cannot have two classes with same name
    const existing = await prisma.class.findUnique({
      where: { schoolId_name: { schoolId, name: input.name } },
    });

    if (existing) {
      throw new AppError(
        `A class named "${input.name}" already exists in your school.`,
        409,
        "CLASS_EXISTS"
      );
    }

    return prisma.class.create({
      data: { schoolId, ...input },
    });
  },

  async findAll(schoolId: string) {
    return prisma.class.findMany({
      where: { schoolId },   // ← tenant isolation
      include: {
        _count: { select: { students: true } },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
  },

  async findById(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,              // ← tenant isolation: can't fetch another school's class
      },
      include: {
        students: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    if (!cls) {
      throw new AppError("Class not found.", 404, "NOT_FOUND");
    }

    return cls;
  },

  async update(schoolId: string, classId: string, input: UpdateClassInput) {
    // Verify ownership before updating
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!cls) {
      throw new AppError("Class not found.", 404, "NOT_FOUND");
    }

    // If renaming, check new name doesn't conflict
    if (input.name && input.name !== cls.name) {
      const conflict = await prisma.class.findUnique({
        where: { schoolId_name: { schoolId, name: input.name } },
      });
      if (conflict) {
        throw new AppError(
          `A class named "${input.name}" already exists.`,
          409,
          "CLASS_EXISTS"
        );
      }
    }

    return prisma.class.update({
      where: { id: classId },
      data: input,
    });
  },

  async delete(schoolId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });

    if (!cls) {
      throw new AppError("Class not found.", 404, "NOT_FOUND");
    }

    await prisma.class.delete({ where: { id: classId } });
  },
};

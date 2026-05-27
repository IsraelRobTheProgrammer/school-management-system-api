import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { hashPassword } from "../../utils/hash";
import { CreateTeacherInput, UpdateTeacherInput } from "./teacher.schema";

// Reusable select shape — never return passwordHash to the client
const teacherSelect = {
  id: true,
  employeeId: true,
  gender: true,
  dateOfBirth: true,
  address: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
    },
  },
};

export const teacherService = {
  async create(schoolId: string, input: CreateTeacherInput) {
    const {
      firstName, lastName, email, password,
      employeeId, gender, dateOfBirth, address, phone,
    } = input;

    // Check email is not already in use across the whole system
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(
        "A user with this email already exists.",
        409,
        "EMAIL_TAKEN"
      );
    }

    const passwordHash = await hashPassword(password);

    // Transaction: create user account + teacher profile together
    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: "TEACHER",
        },
      });

      return tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
          employeeId,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          address,
        },
        select: teacherSelect,
      });
    });

    return teacher;
  },

  async findAll(schoolId: string) {
    return prisma.teacher.findMany({
      where: { schoolId },    // ← tenant isolation
      select: teacherSelect,
      orderBy: { user: { lastName: "asc" } },
    });
  },

  async findById(schoolId: string, teacherId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },  // ← tenant isolation
      select: teacherSelect,
    });

    if (!teacher) {
      throw new AppError("Teacher not found.", 404, "NOT_FOUND");
    }

    return teacher;
  },

  async update(schoolId: string, teacherId: string, input: UpdateTeacherInput) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      throw new AppError("Teacher not found.", 404, "NOT_FOUND");
    }

    const { firstName, lastName, phone, ...teacherFields } = input;

    // Update both user and teacher records
    return prisma.$transaction(async (tx) => {
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone }),
          },
        });
      }

      return tx.teacher.update({
        where: { id: teacherId },
        data: {
          ...teacherFields,
          dateOfBirth: teacherFields.dateOfBirth
            ? new Date(teacherFields.dateOfBirth)
            : undefined,
        },
        select: teacherSelect,
      });
    });
  },

  async deactivate(schoolId: string, teacherId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      throw new AppError("Teacher not found.", 404, "NOT_FOUND");
    }

    // We deactivate rather than delete to preserve data integrity
    await prisma.user.update({
      where: { id: teacher.userId },
      data: { isActive: false },
    });
  },
};

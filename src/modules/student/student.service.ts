import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { hashPassword } from "../../utils/hash";
import { CreateStudentInput, UpdateStudentInput } from "./student.schema";

const studentSelect = {
  id: true,
  admissionNumber: true,
  gender: true,
  dateOfBirth: true,
  address: true,
  guardianName: true,
  guardianPhone: true,
  guardianEmail: true,
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
  class: {
    select: { id: true, name: true, level: true },
  },
};

export const studentService = {
  async create(schoolId: string, input: CreateStudentInput) {
    const {
      firstName, lastName, email, password, phone,
      admissionNumber, classId, gender, dateOfBirth,
      address, guardianName, guardianPhone, guardianEmail,
    } = input;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError("A user with this email already exists.", 409, "EMAIL_TAKEN");
    }

    // Admission number must be unique per school
    const existingStudent = await prisma.student.findUnique({
      where: { schoolId_admissionNumber: { schoolId, admissionNumber } },
    });
    if (existingStudent) {
      throw new AppError(
        `Admission number "${admissionNumber}" is already in use.`,
        409,
        "ADMISSION_NUMBER_TAKEN"
      );
    }

    // If a classId is provided, verify it belongs to this school
    if (classId) {
      const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!cls) {
        throw new AppError("The specified class does not exist.", 404, "NOT_FOUND");
      }
    }

    const passwordHash = await hashPassword(password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: "STUDENT",
        },
      });

      return tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          admissionNumber,
          classId,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          address,
          guardianName,
          guardianPhone,
          guardianEmail,
        },
        select: studentSelect,
      });
    });
  },

  async findAll(schoolId: string, classId?: string) {
    return prisma.student.findMany({
      where: {
        schoolId,                          // ← tenant isolation
        ...(classId ? { classId } : {}),   // optional filter by class
      },
      select: studentSelect,
      orderBy: { user: { lastName: "asc" } },
    });
  },

  async findById(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },  // ← tenant isolation
      select: studentSelect,
    });

    if (!student) {
      throw new AppError("Student not found.", 404, "NOT_FOUND");
    }

    return student;
  },

  async update(schoolId: string, studentId: string, input: UpdateStudentInput) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new AppError("Student not found.", 404, "NOT_FOUND");
    }

    if (input.classId) {
      const cls = await prisma.class.findFirst({
        where: { id: input.classId, schoolId },
      });
      if (!cls) {
        throw new AppError("The specified class does not exist.", 404, "NOT_FOUND");
      }
    }

    const { firstName, lastName, phone, ...studentFields } = input;

    return prisma.$transaction(async (tx) => {
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone }),
          },
        });
      }

      return tx.student.update({
        where: { id: studentId },
        data: {
          ...studentFields,
          dateOfBirth: studentFields.dateOfBirth
            ? new Date(studentFields.dateOfBirth)
            : undefined,
        },
        select: studentSelect,
      });
    });
  },

  async deactivate(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new AppError("Student not found.", 404, "NOT_FOUND");
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });
  },
};

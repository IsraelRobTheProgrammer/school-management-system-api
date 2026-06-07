import { prisma } from "@/config/database";
import { AppError } from "@/utils/AppError";
import crypto from "crypto";
import { RegisterParentInput } from "./parent.schema";
import { hashPassword } from "@/utils/hash";
import { getGradeRemark } from "@/utils/gradeCalculator";
// import { UpdateSchoolInput } from "./school.schema";

export const parentService = {
  /**
   * Generates a unique invite code for a student.
   * The code is the only thing that links a parent registration
   * to a specific student and school — it must be kept secure.
   *
   * Format: "INV-XXXXXX" (uppercase alphanumeric, 6 chars after prefix)
   */
  async getInviteCode(
    schoolId: string,
    studentId: string,
    createdById: string,
  ) {
    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    });
    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");

    // Generate a collision-resistant code
    const code = `INV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Expire any previously unused codes for this student
    // so there's never more than one active invite per student
    await prisma.parentInvite.updateMany({
      where: { studentId, schoolId, usedAt: null },
      data: { expiresAt: new Date() }, // expire immediately
    });

    const invite = await prisma.parentInvite.create({
      data: {
        code,
        schoolId,
        studentId,
        createdById,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      code: invite.code,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      className: student.class?.name ?? "Unassigned",
      expiresAt: invite.expiresAt,
      instructions:
        "Share this code with the parent. They will use it to register on the parent portal. The code expires in 7 days",
    };
  },

  /**
   * Lists all invite codes for this school with their status.
   * Useful for admins to track who has registered and who hasn't.
   */
  async listInvites(schoolId: string) {
    const invites = prisma.parentInvite.findMany({
      where: { schoolId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return (await invites).map((inv) => ({
      id: inv.id,
      code: inv.code,
      student: {
        id: inv.student.id,
        name: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
        class: inv.student.class?.name ?? "Unassigned",
      },
      status: inv.usedAt
        ? "used"
        : inv.expiresAt < new Date()
          ? "expired"
          : "pending",
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      createdAt: inv.createdAt,
    }));
  },

  /**
   * Parent self-registration using an invite code.
   * The code carries all context: which school, which student.
   * No school selection required from the parent — it's all in the code.
   */
  async registerWithInvite(input: RegisterParentInput) {
    const { firstName, lastName, inviteCode, email, password, phone } = input;

    // check and validate code

    const invite = await prisma.parentInvite.findUnique({
      where: {
        code: inviteCode,
      },
      include: { school: true, student: true },
    });

    if (!invite) {
      throw new AppError(
        "Invalid invite code. Please check the code and try again.",
        400,
        "INVALID_INVITE_CODE",
      );
    }

    if (invite.usedAt) {
      throw new AppError(
        "This invite code has already been used.",
        400,
        "INVITE_ALREADY_USED",
      );
    }

    if (invite.expiresAt < new Date()) {
      throw new AppError(
        "This invite code has expired. Please ask the school admin to generate a new one.",
        400,
        "INVITE_EXPIRED",
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        "EMAIL_TAKEN",
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      // Create parent user account — schoolId comes from the invite
      const user = await tx.user.create({
        data: {
          schoolId: invite.schoolId,
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: "PARENT",
        },
      });

      // Link parent to student
      await tx.parentStudent.create({
        data: {
          parentId: user.id,
          studentId: invite.studentId,
          schoolId: invite.schoolId,
        },
      });

      // Mark invite as used — one-time use
      await tx.parentInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return { user, school: invite.school };
    });

    return {
      message: "Parent account created successfully.",
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        schoolId: invite.schoolId,
      },
      school: {
        id: result.school.id,
        name: result.school.name,
      },
    };
  },

  /**
   * Returns all students linked to the authenticated parent.
   * A parent can have multiple children in the same school.
   */
  async getMyStudents(parentId: string, schoolId: string) {
    const links = await prisma.parentStudent.findMany({
      where: { parentId, schoolId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            class: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    return links.map((link) => ({
      studentId: link.student.id,
      name: `${link.student.user.firstName} ${link.student.user.lastName}`,
      admissionNumber: link.student.admissionNumber,
      class: link.student.class,
    }));
  },

  /**
   * Returns a student's term report — but ONLY if the requesting parent
   * is actually linked to that student. This is a critical authorization check.
   */
  async getStudentReport(
    parentId: string,
    schoolId: string,
    studentId: string,
    term: string,
    academicYear: string,
  ) {
    // Verify parent is linked to this student — not just any student in the school
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });

    if (!link || link.schoolId !== schoolId) {
      throw new AppError(
        "You do not have access to this student's records.",
        403,
        "FORBIDDEN",
      );
    }

    const [student, grades] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, schoolId },
        include: {
          user: { select: { firstName: true, lastName: true } },
          class: { select: { name: true, level: true } },
        },
      }),
      prisma.grade.findMany({
        where: {
          schoolId,
          studentId,
          term: term as "FIRST" | "SECOND" | "THIRD",
          academicYear,
        },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { subject: { name: "asc" } },
      }),
    ]);

    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");

    const totalScore = grades.reduce((sum, g) => sum + g.totalScore, 0);
    const average =
      grades.length > 0
        ? Math.round((totalScore / grades.length) * 100) / 100
        : 0;

    return {
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.class,
      },
      term,
      academicYear,
      grades: grades.map((g) => ({
        subject: g.subject.name,
        caScore: g.caScore,
        examScore: g.examScore,
        totalScore: g.totalScore,
        letterGrade: g.letterGrade,
        remark: getGradeRemark(g.letterGrade),
      })),
      summary: {
        totalSubjects: grades.length,
        average,
        totalScore,
      },
    };
  },

  /**
   * Returns a student's attendance summary — gated by parent-student link.
   */
  async getStudentAttendance(
    parentId: string,
    schoolId: string,
    studentId: string,
  ) {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });

    if (!link || link.schoolId !== schoolId) {
      throw new AppError(
        "You do not have access to this student's records.",
        403,
        "FORBIDDEN",
      );
    }

    const records = await prisma.attendance.findMany({
      where: { schoolId, studentId },
      select: { status: true, date: true, note: true },
      orderBy: { date: "desc" },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      summary: {
        totalDays: total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: percentage,
      },
      records,
    };
  },
};

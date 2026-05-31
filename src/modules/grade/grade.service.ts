import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { computeLetterGrade, getGradeRemark } from "../../utils/gradeCalculator";
import { CreateGradeInput, UpdateGradeInput, GradeQuery } from "./grade.schema";

const gradeInclude = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  subject: { select: { id: true, name: true, code: true } },
  class: { select: { id: true, name: true, level: true } },
};

export const gradeService = {
  /**
   * Creates or updates a grade for a student in a subject for a given term.
   * Upsert pattern — entering grades is idempotent, teachers can re-enter corrections.
   */
  async upsert(schoolId: string, input: CreateGradeInput) {
    const { studentId, subjectId, classId, term, academicYear, caScore, examScore, comment } = input;

    // Verify all FK references belong to this school
    const [student, subject, cls] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, schoolId } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.class.findFirst({ where: { id: classId, schoolId } }),
    ]);

    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");
    if (!subject) throw new AppError("Subject not found.", 404, "NOT_FOUND");
    if (!cls) throw new AppError("Class not found.", 404, "NOT_FOUND");

    // Verify subject belongs to this class
    if (subject.classId !== classId) {
      throw new AppError(
        "This subject does not belong to the specified class.",
        400,
        "SUBJECT_CLASS_MISMATCH"
      );
    }

    const totalScore = caScore + examScore;
    const letterGrade = computeLetterGrade(totalScore);

    return prisma.grade.upsert({
      where: {
        studentId_subjectId_term_academicYear: {
          studentId,
          subjectId,
          term,
          academicYear,
        },
      },
      create: {
        schoolId,
        studentId,
        subjectId,
        classId,
        term,
        academicYear,
        caScore,
        examScore,
        totalScore,
        letterGrade,
        comment,
      },
      update: {
        caScore,
        examScore,
        totalScore,
        letterGrade,
        comment,
      },
      include: gradeInclude,
    });
  },

  async findMany(schoolId: string, query: GradeQuery) {
    const { studentId, classId, subjectId, term, academicYear } = query;

    return prisma.grade.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(term ? { term } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      include: gradeInclude,
      orderBy: [{ subject: { name: "asc" } }],
    });
  },

  async findById(schoolId: string, gradeId: string) {
    const grade = await prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
      include: gradeInclude,
    });
    if (!grade) throw new AppError("Grade record not found.", 404, "NOT_FOUND");
    return grade;
  },

  async update(schoolId: string, gradeId: string, input: UpdateGradeInput) {
    const grade = await prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) throw new AppError("Grade record not found.", 404, "NOT_FOUND");

    const caScore = input.caScore ?? grade.caScore;
    const examScore = input.examScore ?? grade.examScore;
    const totalScore = caScore + examScore;
    const letterGrade = computeLetterGrade(totalScore);

    return prisma.grade.update({
      where: { id: gradeId },
      data: {
        caScore,
        examScore,
        totalScore,
        letterGrade,
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
      },
      include: gradeInclude,
    });
  },

  /**
   * Full term report for a single student across all subjects.
   * This is the data source for the PDF report card in Phase 3.
   */
  async getStudentReport(
    schoolId: string,
    studentId: string,
    term: string,
    academicYear: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        class: { select: { id: true, name: true, level: true } },
      },
    });
    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");

    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        studentId,
        term: term as "FIRST" | "SECOND" | "THIRD",
        academicYear,
      },
      include: {
        subject: { select: { name: true, code: true } },
      },
      orderBy: { subject: { name: "asc" } },
    });

    const totalScore = grades.reduce((sum, g) => sum + g.totalScore, 0);
    const average = grades.length > 0 ? totalScore / grades.length : 0;
    const overallGrade = computeLetterGrade(average);

    return {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.class,
      },
      term,
      academicYear,
      grades: grades.map((g) => ({
        subject: g.subject.name,
        subjectCode: g.subject.code,
        caScore: g.caScore,
        examScore: g.examScore,
        totalScore: g.totalScore,
        letterGrade: g.letterGrade,
        remark: getGradeRemark(g.letterGrade),
        comment: g.comment,
      })),
      summary: {
        totalSubjects: grades.length,
        totalScore,
        average: Math.round(average * 100) / 100,
        overallGrade,
        overallRemark: getGradeRemark(overallGrade),
      },
    };
  },

  /**
   * All grades for a class in a given term — useful for admin overview.
   */
  async getClassReport(
    schoolId: string,
    classId: string,
    term: string,
    academicYear: string
  ) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!cls) throw new AppError("Class not found.", 404, "NOT_FOUND");

    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        classId,
        term: term as "FIRST" | "SECOND" | "THIRD",
        academicYear,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subject: { select: { name: true, code: true } },
      },
      orderBy: [{ student: { user: { lastName: "asc" } } }, { subject: { name: "asc" } }],
    });

    return {
      class: { id: cls.id, name: cls.name, level: cls.level },
      term,
      academicYear,
      totalGradeRecords: grades.length,
      grades,
    };
  },
};

import { prisma } from "@/config/database";
import { AppError } from "@/utils/AppError";
import { getGradeRemark } from "@/utils/gradeCalculator";
import { generateReportCard, ReportCardData } from "@/utils/pdfGen";

export const reportService = {
  /**
   * Generates a PDF report card for a student for a given term.
   * Pulls grade data, attendance summary, school info, and student info
   * then hands it all to the PDF utility.
   * Returns a Buffer — the controller streams it directly to the response.
   */

  async generateStudentReportCard(
    schoolId: string,
    studentId: string,
    term: "FIRST" | "SECOND" | "THIRD",
    academicYear: string,
  ): Promise<Buffer> {
    // Fetch everything in parallel
    const [school, student, grades] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, address: true, email: true, phone: true },
      }),

      prisma.student.findFirst({
        where: { id: studentId, schoolId },
        select: {
          id: true,
          admissionNumber: true,
          user: { select: { firstName: true, lastName: true } },
          class: { select: { name: true, level: true } },
        },
      }),

      prisma.grade.findMany({
        where: { schoolId, studentId, term, academicYear },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { subject: { name: "asc" } },
      }),
    ]);

    if (!school) throw new AppError("School not found.", 404, "NOT_FOUND");
    if (!student) throw new AppError("Student not found.", 404, "NOT_FOUND");
    if (grades.length === 0) {
      throw new AppError(
        `No grades found for ${term} term ${academicYear}. Please ensure grades have been entered before generating a report card.`,
        404,
        "NO_GRADES",
      );
    }

    // Attendance Breakdown
    const attendanceRecords = await prisma.attendance.findMany({
      where: { schoolId, studentId },
      select: { status: true },
    });

    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;

    const attendancePercentage =
      totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    // Build grade rows for each subject
    const gradeRows = grades.map((g) => ({
      subject: g.subject.name,
      subjectCode: g.subject.code,
      caScore: g.caScore,
      examScore: g.examScore,
      totalScore: g.totalScore,
      letterGrade: g.letterGrade,
      remark: getGradeRemark(g.letterGrade),
      comment: g.comment,
    }));

    const totalScore = gradeRows.reduce((sum, g) => sum + g.totalScore, 0);
    const average =
      gradeRows.length > 0
        ? Math.round((totalScore / gradeRows.length) * 100) / 100
        : 0;

    // Compute overall letter grade from average
    const { computeLetterGrade } = await import("../../utils/gradeCalculator");
    const overallGrade = computeLetterGrade(average);

    const reportData: ReportCardData = {
      school,
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.class,
      },
      term,
      academicYear,
      grades: gradeRows,
      summary: {
        totalSubjects: gradeRows.length,
        totalScore,
        average,
        overallGrade,
        overallRemark: getGradeRemark(overallGrade),
      },
      attendance:
        totalDays > 0
          ? { totalDays, present, attendancePercentage }
          : undefined,
    };

    return generateReportCard(reportData);
  },
};

import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";

/**
 * Escapes a CSV cell value.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
const escapeCell = (value: unknown): string => {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts an array of row arrays into a CSV string.
 */
const buildCsv = (headers: string[], rows: unknown[][]): string => {
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCell).join(","));
  return [headerLine, ...dataLines].join("\n");
};

export const exportService = {
  /**
   * Attendance CSV export.
   * Filterable by classId and date range.
   * Each row: student name, admission no, class, date, status, note.
   */
  async attendanceCsv(
    schoolId: string,
    filters: {
      classId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ csv: string; filename: string }> {
    const { classId, startDate, endDate } = filters;

    if (!classId && !startDate) {
      throw new AppError(
        "Please provide at least classId or startDate to export attendance.",
        400,
        "MISSING_FILTER",
      );
    }

    const dateFilter =
      startDate && endDate
        ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
        : startDate
          ? { date: { gte: new Date(startDate) } }
          : {};

    const records = await prisma.attendance.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        ...dateFilter,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        class: { select: { name: true, level: true } },
      },
      orderBy: [{ date: "asc" }, { student: { user: { lastName: "asc" } } }],
    });

    if (records.length === 0) {
      throw new AppError(
        "No attendance records found for the specified filters.",
        404,
        "NO_DATA",
      );
    }

    const headers = [
      "Student Name",
      "Admission Number",
      "Class",
      "Level",
      "Date",
      "Status",
      "Note",
    ];

    const rows = records.map((r: any) => [
      `${r.student.user.firstName} ${r.student.user.lastName}`,
      r.student.admissionNumber,
      r.class.name,
      r.class.level,
      r.date.toISOString().split("T")[0], // YYYY-MM-DD
      r.status,
      r.note ?? "",
    ]);

    const dateSuffix = startDate
      ? `${startDate}${endDate ? `-to-${endDate}` : ""}`
      : "all";
    const filename = `attendance-export-${dateSuffix}.csv`;

    return { csv: buildCsv(headers, rows), filename };
  },

  /**
   * Grades CSV export.
   * Filterable by classId, term, academicYear.
   * Each row: student name, admission no, class, subject, CA, exam, total, grade.
   */
  async gradesCsv(
    schoolId: string,
    filters: {
      classId?: string;
      term?: string;
      academicYear?: string;
    },
  ): Promise<{ csv: string; filename: string }> {
    const { classId, term, academicYear } = filters;

    if (!term || !academicYear) {
      throw new AppError(
        "term and academicYear are required for grades export.",
        400,
        "MISSING_FILTER",
      );
    }

    const records = await prisma.grade.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        term: term as "FIRST" | "SECOND" | "THIRD",
        academicYear,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subject: { select: { name: true, code: true } },
        class: { select: { name: true, level: true } },
      },
      orderBy: [
        { student: { user: { lastName: "asc" } } },
        { subject: { name: "asc" } },
      ],
    });

    if (records.length === 0) {
      throw new AppError(
        "No grade records found for the specified filters.",
        404,
        "NO_DATA",
      );
    }

    const headers = [
      "Student Name",
      "Admission Number",
      "Class",
      "Level",
      "Subject",
      "Subject Code",
      "Term",
      "Academic Year",
      "CA Score (/40)",
      "Exam Score (/60)",
      "Total Score (/100)",
      "Letter Grade",
    ];

    const rows = records.map((r: any) => [
      `${r.student.user.firstName} ${r.student.user.lastName}`,
      r.student.admissionNumber,
      r.class.name,
      r.class.level,
      r.subject.name,
      r.subject.code ?? "",
      r.term,
      r.academicYear,
      r.caScore,
      r.examScore,
      r.totalScore,
      r.letterGrade,
    ]);

    const filename = `grades-${term}-${academicYear.replace("/", "-")}.csv`;

    return { csv: buildCsv(headers, rows), filename };
  },
};

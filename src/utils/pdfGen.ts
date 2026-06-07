import PDFDocument from "pdfkit";

interface ReportGrade {
  subject: string;
  subjectCode: string | null;
  caScore: number;
  examScore: number;
  totalScore: number;
  letterGrade: string;
  remark: string;
  comment: string | null;
}

interface ReportSummary {
  totalSubjects: number;
  totalScore: number;
  average: number;
  overallGrade: string;
  overallRemark: string;
}

interface AttendanceSummary {
  totalDays: number;
  present: number;
  attendancePercentage: number;
}

export interface ReportCardData {
  school: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  student: {
    name: string;
    admissionNumber: string;
    class: { name: string; level: string } | null;
  };
  term: string;
  academicYear: string;
  grades: ReportGrade[];
  summary: ReportSummary;
  attendance?: AttendanceSummary;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1a365d", // Deep navy
  secondary: "#2b6cb0", // Mid blue
  accent: "#ebf8ff", // Very light blue — table header bg
  text: "#1a202c", // Near black
  muted: "#718096", // Grey
  border: "#bee3f8", // Light blue border
  white: "#ffffff",
  pass: "#276749", // Green for passing grades
  fail: "#c53030", // Red for failing grades
};

/**
 * Generates a PDF report card and returns it as a Buffer.
 * The Buffer is streamed directly to the HTTP response — no temp files.
 */
export const generateReportCard = (data: ReportCardData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `Report Card — ${data.student.name}`,
        Author: data.school.name,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // accounting for margins
    const left = 50;

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(left, 40, pageWidth, 70).fill(COLORS.primary);

    doc
      .fillColor(COLORS.white)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(data.school.name.toUpperCase(), left + 12, 52, {
        width: pageWidth - 24,
        align: "center",
      });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("STUDENT REPORT CARD", left + 12, 76, {
        width: pageWidth - 24,
        align: "center",
      });

    // ── Term / Year badge (top right) ─────────────────────────────────────────
    const termText = `${data.term} TERM  •  ${data.academicYear}`;
    doc
      .fontSize(9)
      .fillColor(COLORS.white)
      .text(termText, left + 12, 90, {
        width: pageWidth - 24,
        align: "right",
      });

    let y = 130;

    // ── School contact line ───────────────────────────────────────────────────
    const contactParts = [
      data.school.address,
      data.school.phone,
      data.school.email,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(contactParts.join("  |  "), left, y, {
          width: pageWidth,
          align: "center",
        });
      y += 16;
    }

    // ── Student info box ──────────────────────────────────────────────────────
    doc.rect(left, y, pageWidth, 44).fill(COLORS.accent);

    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Student Name:", left + 10, y + 8)
      .font("Helvetica")
      .text(data.student.name, left + 100, y + 8);

    doc
      .font("Helvetica-Bold")
      .text("Admission No:", left + 10, y + 24)
      .font("Helvetica")
      .text(data.student.admissionNumber, left + 100, y + 24);

    if (data.student.class) {
      doc
        .font("Helvetica-Bold")
        .text("Class:", left + 280, y + 8)
        .font("Helvetica")
        .text(data.student.class.name, left + 320, y + 8);

      doc
        .font("Helvetica-Bold")
        .text("Level:", left + 280, y + 24)
        .font("Helvetica")
        .text(data.student.class.level, left + 320, y + 24);
    }

    y += 56;

    // ── Grades table header ───────────────────────────────────────────────────
    const colWidths = {
      subject: 180,
      ca: 55,
      exam: 55,
      total: 55,
      grade: 45,
      remark: 105,
    };

    // Header row
    doc.rect(left, y, pageWidth, 20).fill(COLORS.secondary);

    doc.fillColor(COLORS.white).fontSize(9).font("Helvetica-Bold");

    let cx = left + 6;
    doc.text("SUBJECT", cx, y + 5, { width: colWidths.subject });
    cx += colWidths.subject;
    doc.text("CA /40", cx, y + 5, { width: colWidths.ca, align: "center" });
    cx += colWidths.ca;
    doc.text("EXAM /60", cx, y + 5, { width: colWidths.exam, align: "center" });
    cx += colWidths.exam;
    doc.text("TOTAL", cx, y + 5, { width: colWidths.total, align: "center" });
    cx += colWidths.total;
    doc.text("GRADE", cx, y + 5, { width: colWidths.grade, align: "center" });
    cx += colWidths.grade;
    doc.text("REMARK", cx, y + 5, { width: colWidths.remark });

    y += 20;

    // ── Grade rows ────────────────────────────────────────────────────────────
    data.grades.forEach((grade, index) => {
      const rowBg = index % 2 === 0 ? COLORS.white : "#f7fafc";
      doc.rect(left, y, pageWidth, 18).fill(rowBg);

      // Vertical dividers
      doc.strokeColor(COLORS.border).lineWidth(0.5);
      let divX = left + colWidths.subject;
      [colWidths.ca, colWidths.exam, colWidths.total, colWidths.grade].forEach(
        (w) => {
          doc
            .moveTo(divX, y)
            .lineTo(divX, y + 18)
            .stroke();
          divX += w;
        },
      );

      const gradeColor = grade.letterGrade === "F" ? COLORS.fail : COLORS.text;

      doc.fillColor(COLORS.text).fontSize(9).font("Helvetica");

      cx = left + 6;
      const subjectLabel = grade.subjectCode
        ? `${grade.subject} (${grade.subjectCode})`
        : grade.subject;
      doc.text(subjectLabel, cx, y + 4, { width: colWidths.subject - 6 });
      cx += colWidths.subject;
      doc.text(grade.caScore.toString(), cx, y + 4, {
        width: colWidths.ca,
        align: "center",
      });
      cx += colWidths.ca;
      doc.text(grade.examScore.toString(), cx, y + 4, {
        width: colWidths.exam,
        align: "center",
      });
      cx += colWidths.exam;

      // Total with colour
      doc
        .fillColor(gradeColor)
        .font("Helvetica-Bold")
        .text(grade.totalScore.toString(), cx, y + 4, {
          width: colWidths.total,
          align: "center",
        });
      cx += colWidths.total;

      doc.text(grade.letterGrade, cx, y + 4, {
        width: colWidths.grade,
        align: "center",
      });
      cx += colWidths.grade;

      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .text(grade.remark, cx, y + 4, { width: colWidths.remark });

      y += 18;
    });

    // Bottom border of table
    doc.rect(left, y, pageWidth, 1).fill(COLORS.secondary);
    y += 12;

    // ── Summary box ───────────────────────────────────────────────────────────
    doc.rect(left, y, pageWidth, 38).fill(COLORS.accent);

    doc.fillColor(COLORS.text).fontSize(9);

    const summaryItems = [
      `Total Score: ${data.summary.totalScore}`,
      `Average: ${data.summary.average}%`,
      `Overall Grade: ${data.summary.overallGrade}`,
      `Remark: ${data.summary.overallRemark}`,
    ];

    const itemWidth = pageWidth / summaryItems.length;
    summaryItems.forEach((item, i) => {
      const [label, value] = item.split(": ");
      doc
        .font("Helvetica-Bold")
        .text(`${label}:`, left + i * itemWidth + 8, y + 8, {
          width: itemWidth - 8,
        });
      doc
        .font("Helvetica")
        .fillColor(
          label === "Overall Grade" && data.summary.overallGrade === "F"
            ? COLORS.fail
            : COLORS.secondary,
        )
        .text(value, left + i * itemWidth + 8, y + 22, {
          width: itemWidth - 8,
        });
    });

    y += 50;

    // ── Attendance section ────────────────────────────────────────────────────
    if (data.attendance) {
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("ATTENDANCE SUMMARY", left, y);

      y += 14;
      doc.rect(left, y, pageWidth, 26).fill(COLORS.accent);

      doc.fillColor(COLORS.text).fontSize(9).font("Helvetica");
      doc.text(
        `Days Present: ${data.attendance.present} / ${data.attendance.totalDays}`,
        left + 10,
        y + 8,
      );
      doc.text(
        `Attendance Rate: ${data.attendance.attendancePercentage}%`,
        left + 200,
        y + 8,
      );

      const attendanceColor =
        data.attendance.attendancePercentage >= 75 ? COLORS.pass : COLORS.fail;
      doc
        .fillColor(attendanceColor)
        .font("Helvetica-Bold")
        .text(
          data.attendance.attendancePercentage >= 75
            ? "SATISFACTORY"
            : "NEEDS IMPROVEMENT",
          left + 380,
          y + 8,
        );

      y += 38;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.rect(left, footerY, pageWidth, 0.5).fill(COLORS.border);

    doc
      .fillColor(COLORS.muted)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Generated on ${new Date().toLocaleDateString("en-NG", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} — ${data.school.name}`,
        left,
        footerY + 8,
        { width: pageWidth, align: "center" },
      );

    doc.end();
  });
};

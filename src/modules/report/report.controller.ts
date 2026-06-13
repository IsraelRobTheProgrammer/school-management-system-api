import { Request, Response } from "express";
import { reportService } from "./report.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";
import { Controller } from "../../types/express";

export const reportController: Controller = {
  /**
   * Streams the PDF directly to the response.
   * The browser receives it with the correct headers and triggers a download.
   */

  downloadReportCard: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing", 403);

    const { studentId } = req.params;
    const { term, academicYear } = req.query as {
      term: string;
      academicYear: string;
    };

    if (!term || !academicYear) {
      throw new AppError(
        "term and academicYear query params are required",
        400,
        "MISSING_PARAMS"
      );
    }

    if (!["FIRST", "SECOND", "THIRD"].includes(term)) {
      throw new AppError(
        "term must be FIRST, SECOND or THIRD.",
        400,
        "INVALID_TERM"
      );
    }

    const pdfBuffer = await reportService.generateStudentReportCard(
      req.schoolId,
      studentId,
      term as "FIRST" | "SECOND" | "THIRD",
      academicYear
    );

    // Filename: "report-card-FIRST-2024-2025.pdf"
    const filename = `report-card-${term}-${academicYear.replace(
      "/",
      "-"
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  }),
};

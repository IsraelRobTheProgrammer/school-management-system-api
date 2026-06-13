import { Request, Response } from "express";
import { gradeService } from "./grade.service";
import {
  createGradeSchema,
  updateGradeSchema,
  gradeQuerySchema,
} from "./grade.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const gradeController: Controller = {
  upsert: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createGradeSchema.parse({ body: req.body });
    const grade = await gradeService.upsert(req.schoolId, body);
    sendSuccess({
      res,
      message: "Grade saved successfully.",
      data: grade,
      statusCode: 201,
    });
  }),

  getMany: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { query } = gradeQuerySchema.parse({ query: req.query });
    const grades = await gradeService.findMany(req.schoolId, query);
    sendSuccess({ res, message: "Grades fetched successfully.", data: grades });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const grade = await gradeService.findById(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Grade fetched successfully.", data: grade });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateGradeSchema.parse({ body: req.body });
    const grade = await gradeService.update(req.schoolId, req.params.id, body);
    sendSuccess({ res, message: "Grade updated successfully.", data: grade });
  }),

  getStudentReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { studentId } = req.params;
    const { term, academicYear } = req.query as {
      term: string;
      academicYear: string;
    };

    if (!term || !academicYear) {
      throw new AppError(
        "term and academicYear query params are required.",
        400,
        "MISSING_PARAMS",
      );
    }

    const report = await gradeService.getStudentReport(
      req.schoolId,
      studentId,
      term,
      academicYear,
    );
    sendSuccess({
      res,
      message: "Student report fetched successfully.",
      data: report,
    });
  }),

  getClassReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { classId } = req.params;
    const { term, academicYear } = req.query as {
      term: string;
      academicYear: string;
    };

    if (!term || !academicYear) {
      throw new AppError(
        "term and academicYear query params are required.",
        400,
        "MISSING_PARAMS",
      );
    }

    const report = await gradeService.getClassReport(
      req.schoolId,
      classId,
      term,
      academicYear,
    );
    sendSuccess({
      res,
      message: "Class report fetched successfully.",
      data: report,
    });
  }),
};

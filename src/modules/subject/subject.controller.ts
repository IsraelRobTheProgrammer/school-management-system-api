import { Request, Response } from "express";
import { subjectService } from "./subject.service";
import { createSubjectSchema, updateSubjectSchema } from "./subject.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

export const subjectController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createSubjectSchema.parse({ body: req.body });
    const subject = await subjectService.create(req.schoolId, body);
    sendSuccess({ res, message: "Subject created successfully.", data: subject, statusCode: 201 });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const classId = req.query.classId as string | undefined;
    const subjects = await subjectService.findAll(req.schoolId, classId);
    sendSuccess({ res, message: "Subjects fetched successfully.", data: subjects });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const subject = await subjectService.findById(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Subject fetched successfully.", data: subject });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateSubjectSchema.parse({ body: req.body });
    const subject = await subjectService.update(req.schoolId, req.params.id, body);
    sendSuccess({ res, message: "Subject updated successfully.", data: subject });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    await subjectService.delete(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Subject deleted successfully." });
  }),
};

import { Request, Response } from "express";
import { classService } from "./class.service";
import { createClassSchema, updateClassSchema } from "./class.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

export const classController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createClassSchema.parse({ body: req.body });
    const cls = await classService.create(req.schoolId, body);
    sendSuccess({ res, message: "Class created successfully.", data: cls, statusCode: 201 });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const classes = await classService.findAll(req.schoolId);
    sendSuccess({ res, message: "Classes fetched successfully.", data: classes });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const cls = await classService.findById(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Class fetched successfully.", data: cls });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateClassSchema.parse({ body: req.body });
    const cls = await classService.update(req.schoolId, req.params.id, body);
    sendSuccess({ res, message: "Class updated successfully.", data: cls });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    await classService.delete(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Class deleted successfully." });
  }),
};

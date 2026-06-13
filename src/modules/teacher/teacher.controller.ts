import { Request, Response } from "express";
import { teacherService } from "./teacher.service";
import { createTeacherSchema, updateTeacherSchema } from "./teacher.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const teacherController: Controller = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createTeacherSchema.parse({ body: req.body });
    const teacher = await teacherService.create(req.schoolId, body);
    sendSuccess({
      res,
      message: "Teacher created successfully.",
      data: teacher,
      statusCode: 201,
    });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const teachers = await teacherService.findAll(req.schoolId);
    sendSuccess({
      res,
      message: "Teachers fetched successfully.",
      data: teachers,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const teacher = await teacherService.findById(req.schoolId, req.params.id);
    sendSuccess({
      res,
      message: "Teacher fetched successfully.",
      data: teacher,
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateTeacherSchema.parse({ body: req.body });
    const teacher = await teacherService.update(
      req.schoolId,
      req.params.id,
      body,
    );
    sendSuccess({
      res,
      message: "Teacher updated successfully.",
      data: teacher,
    });
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    await teacherService.deactivate(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Teacher deactivated successfully." });
  }),
};

import { Request, Response } from "express";
import { studentService } from "./student.service";
import { createStudentSchema, updateStudentSchema } from "./student.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const studentController: Controller = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createStudentSchema.parse({ body: req.body });
    const student = await studentService.create(req.schoolId, body);
    sendSuccess({
      res,
      message: "Student created successfully.",
      data: student,
      statusCode: 201,
    });
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    // Optional ?classId= filter
    const classId = req.query.classId as string | undefined;
    const students = await studentService.findAll(req.schoolId, classId);
    sendSuccess({
      res,
      message: "Students fetched successfully.",
      data: students,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const student = await studentService.findById(req.schoolId, req.params.id);
    sendSuccess({
      res,
      message: "Student fetched successfully.",
      data: student,
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateStudentSchema.parse({ body: req.body });
    const student = await studentService.update(
      req.schoolId,
      req.params.id,
      body,
    );
    sendSuccess({
      res,
      message: "Student updated successfully.",
      data: student,
    });
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    await studentService.deactivate(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Student deactivated successfully." });
  }),
};

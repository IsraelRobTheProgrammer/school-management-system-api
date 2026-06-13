import { Request, Response } from "express";
import { timetableService } from "./timetable.service";
import {
  createTimetableSchema,
  updateTimetableSchema,
} from "./timetable.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const timetableController: Controller = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = createTimetableSchema.parse({ body: req.body });
    const entry = await timetableService.create(req.schoolId, body);
    sendSuccess({
      res,
      message: "Timetable entry created successfully.",
      data: entry,
      statusCode: 201,
    });
  }),

  getClassTimetable: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const timetable = await timetableService.getClassTimetable(
      req.schoolId,
      req.params.classId,
    );
    sendSuccess({
      res,
      message: "Class timetable fetched successfully.",
      data: timetable,
    });
  }),

  getTeacherTimetable: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const timetable = await timetableService.getTeacherTimetable(
      req.schoolId,
      req.params.teacherId,
    );
    sendSuccess({
      res,
      message: "Teacher timetable fetched successfully.",
      data: timetable,
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateTimetableSchema.parse({ body: req.body });
    const entry = await timetableService.update(
      req.schoolId,
      req.params.id,
      body,
    );
    sendSuccess({
      res,
      message: "Timetable entry updated successfully.",
      data: entry,
    });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    await timetableService.delete(req.schoolId, req.params.id);
    sendSuccess({ res, message: "Timetable entry deleted successfully." });
  }),
};

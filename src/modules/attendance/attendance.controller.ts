import { Request, Response } from "express";
import { attendanceService } from "./attendance.service";
import {
  recordAttendanceSchema,
  updateAttendanceSchema,
  attendanceQuerySchema,
} from "./attendance.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

export const attendanceController = {
  record: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = recordAttendanceSchema.parse({ body: req.body });
    const result = await attendanceService.record(req.schoolId, body);
    sendSuccess({ res, message: "Attendance recorded successfully.", data: result, statusCode: 201 });
  }),

  getMany: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { query } = attendanceQuerySchema.parse({ query: req.query });
    const records = await attendanceService.findMany(req.schoolId, query);
    sendSuccess({ res, message: "Attendance records fetched successfully.", data: records });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateAttendanceSchema.parse({ body: req.body });
    const record = await attendanceService.update(req.schoolId, req.params.id, body);
    sendSuccess({ res, message: "Attendance record updated successfully.", data: record });
  }),

  getStudentSummary: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { studentId } = req.params;
    const summary = await attendanceService.getStudentSummary(req.schoolId, studentId);
    sendSuccess({ res, message: "Attendance summary fetched successfully.", data: summary });
  }),
};

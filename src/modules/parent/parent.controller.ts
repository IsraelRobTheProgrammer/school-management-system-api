import { Request, Response } from "express";
// import { updateSchoolSchema } from "./school.schema";
import { sendSuccess } from "@/utils/apiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";
import { parentService } from "./parent.service";
import { registerParentSchema } from "./parent.schema";

export const parentController = {
  // ── Admin actions ──────────────────────────────────────────────────────────

  generateInvite: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId || !req.user)
      throw new AppError("Tenant context missing.", 403);

    const result = await parentService.getInviteCode(
      req.schoolId,
      req.params.studentId,
      req.user.userId,
    );

    sendSuccess({
      res,
      message: "Invite code generated successfully.",
      data: result,
      statusCode: 201,
    });
  }),

  listInvites: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing", 403);
    const invites = await parentService.listInvites(req.schoolId);
    sendSuccess({
      res,
      message: "Invites fetched successfully",
      data: invites,
    });
  }),

  // ── Public — no auth needed (parent is registering for the first time) ─────
  registerWithInvite: asyncHandler(async (req: Request, res: Response) => {
    const { body } = registerParentSchema.parse({ body: req.body });
    const result = await parentService.registerWithInvite(body);
    sendSuccess({
      res,
      message: result.message,
      data: result,
      statusCode: 201,
    });
  }),

  // Parent portal main OPS (requires auth)
  getMyStudents: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId || !req.user)
      throw new AppError("Tenant context missing", 403);

    const students = await parentService.getMyStudents(
      req.user.userId,
      req.schoolId,
    );
    sendSuccess({
      res,
      message: "Students fetched successfully.",
      data: students,
    });
  }),

  getStudentReport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId || !req.user)
      throw new AppError("Tenant context missing.", 403);

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

    const report = await parentService.getStudentReport(
      req.user.userId,
      req.schoolId,
      studentId,
      term,
      academicYear,
    );

    sendSuccess({ res, message: "Report fetched successfully.", data: report });
  }),

  getStudentAttendance: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId || !req.user)
      throw new AppError("Tenant context missing.", 403);

    const attendance = await parentService.getStudentAttendance(
      req.user.userId,
      req.schoolId,
      req.params.studentId,
    );

    sendSuccess({
      res,
      message: "Attendance fetched successfully.",
      data: attendance,
    });
  }),
};

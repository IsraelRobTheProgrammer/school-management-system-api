import { Request, Response } from "express";
import { adminService } from "./admin.service";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

export const adminController = {
  getDashboard: asyncHandler(async (_req: Request, res: Response) => {
    const dashboard = await adminService.getDashboard();
    sendSuccess({ res, message: "Dashboard data fetched.", data: dashboard });
  }),

  getAllSchools: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await adminService.getAllSchools(page, limit);
    sendSuccess({ res, message: "Schools fetched successfully.", data: result });
  }),

  toggleSchoolStatus: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.toggleSchoolStatus(req.params.id);
    sendSuccess({ res, message: result.message, data: result.school });
  }),

  getRevenueHistory: asyncHandler(async (req: Request, res: Response) => {
    const months = parseInt(req.query.months as string) || 6;
    const history = await adminService.getRevenueHistory(months);
    sendSuccess({ res, message: "Revenue history fetched.", data: history });
  }),
};

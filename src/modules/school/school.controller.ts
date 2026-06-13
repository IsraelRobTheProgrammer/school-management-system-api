import { Request, Response } from "express";
import { schoolService } from "./school.service";
import { updateSchoolSchema } from "./school.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const schoolController: Controller = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const school = await schoolService.getProfile(req.schoolId);
    sendSuccess({
      res,
      message: "School profile fetched successfully.",
      data: school,
    });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);
    const { body } = updateSchoolSchema.parse({ body: req.body });
    const school = await schoolService.updateProfile(req.schoolId, body);
    sendSuccess({
      res,
      message: "School profile updated successfully.",
      data: school,
    });
  }),

  // SUPER_ADMIN: list all schools across all tenants
  getAllSchools: asyncHandler(async (_req: Request, res: Response) => {
    const schools = await schoolService.getAllSchools();
    sendSuccess({
      res,
      message: "Schools fetched successfully.",
      data: schools,
    });
  }),
};

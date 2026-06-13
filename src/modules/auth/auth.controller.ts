import { Request, Response } from "express";
import { authService } from "./auth.service";
import {
  registerSchoolSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { Controller } from "@/types/expressUtils";

export const authController: Controller = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { body } = registerSchoolSchema.parse({ body: req.body });
    const result = await authService.register(body);

    sendSuccess({
      res,
      message: "School registered successfully. Welcome aboard!",
      data: result,
      statusCode: 201,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { body } = loginSchema.parse({ body: req.body });
    const result = await authService.login(body);

    sendSuccess({
      res,
      message: "Login successful.",
      data: result,
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { body } = refreshTokenSchema.parse({ body: req.body });
    const result = await authService.refresh(body.refreshToken);

    sendSuccess({
      res,
      message: "Token refreshed successfully.",
      data: result,
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { body } = refreshTokenSchema.parse({ body: req.body });
    await authService.logout(body.refreshToken);

    sendSuccess({
      res,
      message: "Logged out successfully.",
    });
  }),
};

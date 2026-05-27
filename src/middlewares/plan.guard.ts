import { Request, Response, NextFunction } from "express";
import { Plan } from "@prisma/client";
import { sendError } from "../utils/apiResponse";

/**
 * Plan guard factory. Gates routes behind a required plan level.
 *
 * Usage:
 *   router.get('/report-cards', authenticate, enforceTenant, requirePlan('PREMIUM'), ...)
 *
 * When a Basic school hits a Premium route, they get a 403 with an
 * upgrade message — not a confusing 404 or 500.
 */
export const requirePlan = (...requiredPlans: Plan[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // SUPER_ADMIN bypasses plan checks entirely
    if (req.user?.role === "SUPER_ADMIN") {
      next();
      return;
    }

    if (!req.plan || !requiredPlans.includes(req.plan)) {
      sendError({
        res,
        message: `This feature requires a ${requiredPlans.join(" or ")} plan. Please upgrade to access it.`,
        statusCode: 403,
        code: "PLAN_UPGRADE_REQUIRED",
      });
      return;
    }

    next();
  };
};

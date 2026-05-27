import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/apiResponse";

/**
 * Runs AFTER authenticate middleware.
 *
 * Extracts schoolId from the verified JWT payload (req.user) and
 * attaches it to req.schoolId. This is the single point of truth
 * for tenant isolation — every downstream service receives this value.
 *
 * This ensures the token is signed by us and not a malicious user
 * who could send any schoolId in a URL param.
 */
export const enforceTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError({
      res,
      message: "Authentication required.",
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
    return;
  }

  // SUPER_ADMIN has no schoolId — they can access all tenants
  // All other roles MUST have a schoolId in their token
  if (req.user.role !== "SUPER_ADMIN" && !req.user.schoolId) {
    sendError({
      res,
      message: "Tenant context is missing. Please log in again.",
      statusCode: 403,
      code: "TENANT_MISSING",
    });
    return;
  }

  // Attach to request for downstream use
  req.schoolId = req.user.schoolId ?? undefined;
  req.plan = req.user.plan ?? undefined;

  next();
};

import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { sendError } from "../utils/apiResponse";

/**
 * Role-based access control factory.
 * Returns a middleware that only allows the specified roles through.
 *
 * Usage:
 *   router.delete('/students/:id', authenticate, authorize('SCHOOL_ADMIN'), ...)
 *   router.get('/students',        authenticate, authorize('SCHOOL_ADMIN', 'TEACHER'), ...)
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError({
        res,
        message: "Authentication required.",
        statusCode: 401,
        code: "UNAUTHORIZED",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError({
        res,
        message: "You do not have permission to perform this action.",
        statusCode: 403,
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
};

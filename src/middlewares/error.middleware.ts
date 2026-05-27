import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";
import { isDevelopment } from "../config/env";

/**
 * Global error handler — must be the last middleware registered in app.ts.
 * Catches all errors forwarded via next(error).
 *
 * Handles three categories:
 *  1. AppError     — our own intentional errors (404, 403, etc.)
 *  2. ZodError     — validation failures from request parsing
 *  3. Everything else — unexpected crashes (always 500)
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // next MUST be declared even if unused — Express requires 4-param signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log every error in development, only unexpected ones in production
  if (isDevelopment || !(err instanceof AppError)) {
    console.error("Error:", err);
  }

  // 1.Operational errors
  if (err instanceof AppError) {
    sendError({
      res,
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
    });
    return;
  }

  // 2. Zod validation errors — flatten into a readable format
  if (err instanceof ZodError) {
    sendError({
      res,
      message: "Validation failed. Please check your input.",
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // 3. Unexpected errors — never expose internal details in production
  sendError({
    res,
    message: isDevelopment
      ? err.message
      : "An unexpected error occurred. Please try again.",
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    details: isDevelopment ? err.stack : undefined,
  });
};

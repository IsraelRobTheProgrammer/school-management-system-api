import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/apiResponse";

/**
 * Verifies the Bearer token in the Authorization header.
 * On success: attaches decoded payload to req.user and moves on.
 * On failure: returns 401 immediately.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError({
      res,
      message: "Authentication required. Please provide a valid token.",
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    sendError({
      res,
      message: "Invalid or expired token. Please log in again.",
      statusCode: 401,
      code: "TOKEN_INVALID",
    });
  }
};

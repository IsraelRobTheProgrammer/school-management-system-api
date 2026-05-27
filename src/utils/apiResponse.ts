import { Response } from "express";

interface SuccessResponseOptions<T> {
  res: Response;
  message: string;
  data?: T;
  statusCode?: number;
}

interface ErrorResponseOptions {
  res: Response;
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const sendSuccess = <T>({
  res,
  message,
  data,
  statusCode = 200,
}: SuccessResponseOptions<T>): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
};

export const sendError = ({
  res,
  message,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  details,
}: ErrorResponseOptions): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {}),
    },
  });
};

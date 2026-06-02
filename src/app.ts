import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { sendError } from "./utils/apiResponse";

// Routers
import authRouter from "./modules/auth/auth.router";
import schoolRouter from "./modules/school/school.router";
import classRouter from "./modules/class/class.router";
import teacherRouter from "./modules/teacher/teacher.router";
import studentRouter from "./modules/student/student.router";

import subjectRouter from "./modules/subject/subject.router";
import attendanceRouter from "./modules/attendance/attendance.router";
import gradeRouter from "./modules/grade/grade.router";
import timetableRouter from "./modules/timetable/timetable.router";

import billingRouter from "./modules/billing/billing.router";
import adminRouter from "./modules/admin/admin.router";

const app: Express = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: { code: "RATE_LIMIT_EXCEEDED" },
  },
});
app.use(globalLimiter);

// Stricter limiter on auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
    error: { code: "AUTH_RATE_LIMIT_EXCEEDED" },
  },
});

// ─── Request Parsing ────────────────────────────────────────────────────────
// express.json() is NOT applied to /billing/webhook — that route uses
// express.raw() internally so Paystack's signature can be verified against
// the raw bytes. All other routes use JSON parsing normally.
app.use(express.json({ limit: "10kb" })); // Prevent oversized payloads
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy.",
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const API_PREFIX = `/api/${env.API_VERSION}`;

// Foundation
app.use(`${API_PREFIX}/auth`, authLimiter, authRouter);
app.use(`${API_PREFIX}/schools`, schoolRouter);
app.use(`${API_PREFIX}/classes`, classRouter);
app.use(`${API_PREFIX}/teachers`, teacherRouter);
app.use(`${API_PREFIX}/students`, studentRouter);

// Academic operations
app.use(`${API_PREFIX}/subjects`, subjectRouter);
app.use(`${API_PREFIX}/attendance`, attendanceRouter);
app.use(`${API_PREFIX}/grades`, gradeRouter);
app.use(`${API_PREFIX}/timetable`, timetableRouter);

// SaaS billing layer and admin
app.use(`${API_PREFIX}/billing`, billingRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  sendError({
    res,
    message: "The requested resource does not exist.",
    statusCode: 404,
    code: "NOT_FOUND",
  });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorMiddleware);

export default app;

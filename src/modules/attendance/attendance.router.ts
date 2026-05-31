import { Router } from "express";
import { attendanceController } from "./attendance.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate, enforceTenant);

// POST   /api/v1/attendance              — Record bulk attendance for a class
// GET    /api/v1/attendance              — Query: ?classId=&date= or ?studentId=&startDate=&endDate=
router
  .route("/")
  .post(authorize("SCHOOL_ADMIN", "TEACHER"), attendanceController.record)
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), attendanceController.getMany);

// GET    /api/v1/attendance/summary/:studentId  — Attendance % for a student
router.get(
  "/summary/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  attendanceController.getStudentSummary
);

// PATCH  /api/v1/attendance/:id          — Correct a single record
router.patch(
  "/:id",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  attendanceController.update
);

export default router;

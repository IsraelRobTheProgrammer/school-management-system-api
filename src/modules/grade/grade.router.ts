import { Router } from "express";
import { gradeController } from "./grade.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate, enforceTenant);

// POST  /api/v1/grades              — Enter/update a grade (upsert)
// GET   /api/v1/grades              — Query grades (?studentId= &classId= &term= &academicYear=)
router
  .route("/")
  .post(authorize("SCHOOL_ADMIN", "TEACHER"), gradeController.upsert)
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), gradeController.getMany);

// GET   /api/v1/grades/report/student/:studentId?term=FIRST&academicYear=2024/2025
router.get(
  "/report/student/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"),
  gradeController.getStudentReport
);

// GET   /api/v1/grades/report/class/:classId?term=FIRST&academicYear=2024/2025
router.get(
  "/report/class/:classId",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  gradeController.getClassReport
);

// GET   /api/v1/grades/:id          — Single grade record
// PATCH /api/v1/grades/:id          — Update scores or comment
router
  .route("/:id")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), gradeController.getById)
  .patch(authorize("SCHOOL_ADMIN", "TEACHER"), gradeController.update);

export default router;

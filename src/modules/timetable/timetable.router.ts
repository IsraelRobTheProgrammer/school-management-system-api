import { Router } from "express";
import { timetableController } from "./timetable.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { requireActiveSubscription } from "../../middlewares/subscription.guard";

const router = Router();

router.use(authenticate, enforceTenant, requireActiveSubscription);

// POST /api/v1/timetable             — Add a timetable entry
router.post(
  "/",
  authorize("SCHOOL_ADMIN"),
  timetableController.create
);

// GET  /api/v1/timetable/class/:classId    — Full weekly schedule for a class
router.get(
  "/class/:classId",
  authorize("SCHOOL_ADMIN", "TEACHER", "STUDENT"),
  timetableController.getClassTimetable
);

// GET  /api/v1/timetable/teacher/:teacherId — Full weekly schedule for a teacher
router.get(
  "/teacher/:teacherId",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  timetableController.getTeacherTimetable
);

// PATCH  /api/v1/timetable/:id        — Update an entry (change teacher or time)
// DELETE /api/v1/timetable/:id        — Remove an entry
router
  .route("/:id")
  .patch(authorize("SCHOOL_ADMIN"), timetableController.update)
  .delete(authorize("SCHOOL_ADMIN"), timetableController.delete);

export default router;

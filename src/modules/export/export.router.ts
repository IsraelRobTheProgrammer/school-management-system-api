import { authenticate } from "@/middlewares/auth.middleware";
import { authorize } from "@/middlewares/rbac.middleware";
import { requireActiveSubscription } from "@/middlewares/subscription.guard";
import { enforceTenant } from "@/middlewares/tenant.middleware";
import { exportController } from "./export.controller";

import { createRouter } from "@/types/express";

const router = createRouter();

router.use(authenticate, enforceTenant, requireActiveSubscription);

/**
 * CSV exports are available on both Basic and Premium.
 * No requirePlan() guard here — it's a feature for all paying schools.
 *
 * GET /api/v1/exports/attendance?classId=&startDate=2024-09-01&endDate=2024-12-31
 * GET /api/v1/exports/grades?classId=&term=FIRST&academicYear=2024/2025
 */
router.get(
  "/attendance",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  exportController.attendance,
);

router.get(
  "/grades",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  exportController.grades,
);

export default router;

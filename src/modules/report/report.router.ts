import { authenticate } from "@/middlewares/auth.middleware";
import { requirePlan } from "@/middlewares/plan.guard";
import { authorize } from "@/middlewares/rbac.middleware";
import { requireActiveSubscription } from "@/middlewares/subscription.guard";
import { enforceTenant } from "@/middlewares/tenant.middleware";
import { reportController } from "./report.controller";

import { createRouter } from "@/types/expressUtils";

const router = createRouter();

router.use(authenticate, enforceTenant, requireActiveSubscription);

/**
 * GET /api/v1/reports/pdf/:studentId?term=FIRST&academicYear=2024/2025
 *
 * Premium only — plan guard returns a clean 403 with upgrade message
 * for Basic schools rather than a confusing error.
 */
router.get(
  "/pdf/:studentId",
  authorize("SCHOOL_ADMIN", "TEACHER"),
  requirePlan("PREMIUM"),
  reportController.downloadReportCard,
);

export default router;

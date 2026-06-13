import { schoolController } from "./school.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

import { createRouter } from "@/types/expressUtils";

const router = createRouter();

// GET  /api/v1/schools/all   — SUPER_ADMIN: all tenants (no enforceTenant)
router.get(
  "/all",
  authenticate,
  authorize("SUPER_ADMIN"),
  schoolController.getAllSchools,
);

// GET   /api/v1/schools/profile  — current school's profile
// PATCH /api/v1/schools/profile  — update current school's profile
router.use(authenticate, enforceTenant);

router
  .route("/profile")
  .get(authorize("SCHOOL_ADMIN"), schoolController.getProfile)
  .patch(authorize("SCHOOL_ADMIN"), schoolController.updateProfile);

export default router;

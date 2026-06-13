import { teacherController } from "./teacher.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { requireActiveSubscription } from "../../middlewares/subscription.guard";

import { createRouter } from "../../types/express";

const router = createRouter();

router.use(authenticate, enforceTenant, requireActiveSubscription);

router
  .route("/")
  .get(authorize("SCHOOL_ADMIN"), teacherController.getAll)
  .post(authorize("SCHOOL_ADMIN"), teacherController.create);

router
  .route("/:id")
  .get(authorize("SCHOOL_ADMIN"), teacherController.getById)
  .patch(authorize("SCHOOL_ADMIN"), teacherController.update);

// PATCH /api/v1/teachers/:id/deactivate
router.patch(
  "/:id/deactivate",
  authorize("SCHOOL_ADMIN"),
  teacherController.deactivate
);

export default router;

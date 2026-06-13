import { studentController } from "./student.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { requireActiveSubscription } from "../../middlewares/subscription.guard";

import { createRouter } from "../../types/express";

const router = createRouter();

router.use(authenticate, enforceTenant, requireActiveSubscription);

router
  .route("/")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), studentController.getAll)
  .post(authorize("SCHOOL_ADMIN"), studentController.create);

router
  .route("/:id")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), studentController.getById)
  .patch(authorize("SCHOOL_ADMIN"), studentController.update);

router.patch(
  "/:id/deactivate",
  authorize("SCHOOL_ADMIN"),
  studentController.deactivate
);

export default router;

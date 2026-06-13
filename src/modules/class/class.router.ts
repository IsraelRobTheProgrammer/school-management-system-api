import { classController } from "./class.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { requireActiveSubscription } from "../../middlewares/subscription.guard";

import { createRouter } from "@/types/express";

const router = createRouter();

// All class routes require authentication and tenant context
router.use(authenticate, enforceTenant, requireActiveSubscription);

// GET    /api/v1/classes       — Admin and Teachers can view
// POST   /api/v1/classes       — Admin only
// GET    /api/v1/classes/:id   — Admin and Teachers
// PATCH  /api/v1/classes/:id   — Admin only
// DELETE /api/v1/classes/:id   — Admin only

router
  .route("/")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), classController.getAll)
  .post(authorize("SCHOOL_ADMIN"), classController.create);

router
  .route("/:id")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), classController.getById)
  .patch(authorize("SCHOOL_ADMIN"), classController.update)
  .delete(authorize("SCHOOL_ADMIN"), classController.delete);

export default router;

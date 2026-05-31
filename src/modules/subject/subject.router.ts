import { Router } from "express";
import { subjectController } from "./subject.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate, enforceTenant);

router
  .route("/")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), subjectController.getAll)
  .post(authorize("SCHOOL_ADMIN"), subjectController.create);

router
  .route("/:id")
  .get(authorize("SCHOOL_ADMIN", "TEACHER"), subjectController.getById)
  .patch(authorize("SCHOOL_ADMIN"), subjectController.update)
  .delete(authorize("SCHOOL_ADMIN"), subjectController.delete);

export default router;

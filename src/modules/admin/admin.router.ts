import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

const router = Router();

/**
 * All admin routes are SUPER_ADMIN only.
 * No enforceTenant here — super admin operates across all tenants.
 */
router.use(authenticate, authorize("SUPER_ADMIN"));

// GET  /api/v1/admin/dashboard         — MRR, school counts, plan breakdown
router.get("/dashboard", adminController.getDashboard);

// GET  /api/v1/admin/schools           — All schools, paginated (?page=1&limit=20)
router.get("/schools", adminController.getAllSchools);

// PATCH /api/v1/admin/schools/:id/toggle — Activate or suspend a school
router.patch("/schools/:id/toggle", adminController.toggleSchoolStatus);

// GET  /api/v1/admin/revenue           — Monthly revenue history (?months=6)
router.get("/revenue", adminController.getRevenueHistory);

export default router;

import { parentController } from "./parent.controller";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorize } from "@/middlewares/rbac.middleware";
import { enforceTenant } from "@/middlewares/tenant.middleware";
import { requirePlan } from "@/middlewares/plan.guard";
import { requireActiveSubscription } from "@/middlewares/subscription.guard";

import { createRouter } from "@/types/express";

const router = createRouter();

/**
 * PUBLIC — no auth needed.
 * The invite code is the credential. Parent is registering for the first time.
 * POST /api/v1/parents/register
 */
router.post("/register", parentController.registerWithInvite);

// All routes below require authentication
router.use(authenticate, enforceTenant, requireActiveSubscription);

/**
 * SCHOOL ADMIN routes — manage invites.
 * All Premium-gated because the parent portal is a Premium feature.
 */

// POST  /api/v1/parents/invite/:studentId  — get invite code for parents
router.post(
    "/invite/:studentId",
    authorize("SCHOOL_ADMIN"),
    requirePlan("PREMIUM"),
    parentController.generateInvite,
);

// GET   /api/v1/parents/invites            — List all invites for the school
router.get(
    "/invites",
    authorize("SCHOOL_ADMIN"),
    requirePlan("PREMIUM"),
    parentController.listInvites,
);

/**
 * PARENT portal routes — parents viewing their own children's data.
 * Also Premium-gated.
 */

// GET   /api/v1/parents/me/students
router.get(
    "/me/students",
    authorize("PARENT"),
    requirePlan("PREMIUM"),
    parentController.getMyStudents,
);

// GET   /api/v1/parents/me/students/:studentId/report?term=FIRST&academicYear=2024/2025
router.get(
    "/me/students/:studentId/report",
    authorize("PARENT"),
    requirePlan("PREMIUM"),
    parentController.getStudentReport,
);

// GET   /api/v1/parents/me/students/:studentId/attendance
router.get(
    "/me/students/:studentId/attendance",
    authorize("PARENT"),
    requirePlan("PREMIUM"),
    parentController.getStudentAttendance,
);

export default router;

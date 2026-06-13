import express from "express";
import { billingController } from "./billing.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { enforceTenant } from "../../middlewares/tenant.middleware";
import { authorize } from "../../middlewares/rbac.middleware";

import { createRouter } from "../../types/express";

const router = createRouter();

/**
 * NB: The webhook route uses express.raw() — not express.json().
 * It needs the raw Buffer to verify Paystack's HMAC signature.
 * express.json() would parse it into an object, destroying the original bytes.
 *
 * This route is mounted BEFORE the authenticate middleware
 * Paystack doesn't send a JWT, it sends a signature header instead.
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  billingController.webhook
);

// All other billing routes require authentication
router.use(authenticate, enforceTenant);

// POST /api/v1/billing/initialize   — Start subscription, get Paystack URL
router.post(
  "/initialize",
  authorize("SCHOOL_ADMIN"),
  billingController.initialize
);

// POST /api/v1/billing/verify/:reference  — Manual payment check
router.post(
  "/verify/:reference",
  authorize("SCHOOL_ADMIN"),
  billingController.verify
);

// GET  /api/v1/billing/subscription  — Current subscription status + invoice history
router.get(
  "/subscription",
  authorize("SCHOOL_ADMIN"),
  billingController.getStatus
);

// POST /api/v1/billing/cancel  — Cancel subscription
router.post("/cancel", authorize("SCHOOL_ADMIN"), billingController.cancel);

export default router;

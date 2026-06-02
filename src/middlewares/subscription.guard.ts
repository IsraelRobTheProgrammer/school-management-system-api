import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { sendError } from "../utils/apiResponse";

/**
 * Checks that the school's subscription is in a usable state.
 * Runs AFTER authenticate + enforceTenant.
 *
 * SUPER_ADMIN bypasses this entirely.
 * TRIAL and ACTIVE schools pass through.
 * PAST_DUE schools get a warning but still pass (grace period).
 * CANCELLED and EXPIRED schools are blocked with a clear message.
 *
 * hit the DB here (not the JWT) because subscription status
 * can change at any time via webhook meaning the JWT would be stale.
 * keep it lightweight: single indexed lookup, select only what is needed.
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // SUPER_ADMIN has no subscription — always passes
  if (req.user?.role === "SUPER_ADMIN") {
    next();
    return;
  }

  if (!req.schoolId) {
    sendError({ res, message: "Tenant context missing.", statusCode: 403, code: "TENANT_MISSING" });
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { schoolId: req.schoolId },
    select: { status: true, currentPeriodEnd: true, trialEndsAt: true },
  });

  // No subscription record — school is on trial implicitly (just registered)
  if (!subscription) {
    next();
    return;
  }

  switch (subscription.status) {
    case "TRIAL": {
      // Check trial hasn't expired
      if (subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
        sendError({
          res,
          message: "Your free trial has expired. Please subscribe to continue using SchoolMS.",
          statusCode: 402,
          code: "TRIAL_EXPIRED",
        });
        return;
      }
      next();
      return;
    }

    case "ACTIVE":
      next();
      return;

    case "PAST_DUE":
      // Allow access but signal to the client to show a payment warning banner
      res.setHeader("X-Subscription-Warning", "past_due");
      next();
      return;

    case "CANCELLED":
      sendError({
        res,
        message: "Your subscription has been cancelled. Please resubscribe to regain access.",
        statusCode: 402,
        code: "SUBSCRIPTION_CANCELLED",
      });
      return;

    case "EXPIRED":
      sendError({
        res,
        message: "Your subscription has expired. Please renew to continue.",
        statusCode: 402,
        code: "SUBSCRIPTION_EXPIRED",
      });
      return;

    default:
      next();
  }
};

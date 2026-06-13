import { Request, Response } from "express";
import { billingService } from "./billing.service";
import { initializeSubscriptionSchema } from "./billing.schema";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Controller } from "@/types/express";

export const billingController: Controller = {
  initialize: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId || !req.user)
      throw new AppError("Tenant context missing.", 403);

    const { body } = initializeSubscriptionSchema.parse({ body: req.body });
    const result = await billingService.initializeSubscription(
      req.schoolId,
      req.user.email,
      body,
    );

    sendSuccess({
      res,
      message:
        "Payment initialized. Redirect the user to the authorization URL.",
      data: result,
      statusCode: 201,
    });
  }),

  /**
   * Webhook handler — unique setup:
   * 1. Must NOT use JSON body parser (we need raw bytes for signature verification)
   * 2. Must always return 200 to Paystack — even on errors — otherwise Paystack
   *    retries the webhook repeatedly. We log errors internally instead.
   */
  webhook: async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      res.sendStatus(400);
      return;
    }

    try {
      // req.body is a Buffer here because of express.raw() on this route
      await billingService.handleWebhook(req.body as Buffer, signature);
      res.sendStatus(200);
    } catch (error) {
      // Log internally but always return 200 — prevents Paystack retry storms
      console.error("[Webhook Error]", error);
      res.sendStatus(200);
    }
  },

  verify: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);

    const result = await billingService.verifyPayment(
      req.schoolId,
      req.params.reference,
    );

    sendSuccess({ res, message: result.message, data: result });
  }),

  getStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);

    const status = await billingService.getSubscriptionStatus(req.schoolId);
    sendSuccess({ res, message: "Subscription status fetched.", data: status });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    if (!req.schoolId) throw new AppError("Tenant context missing.", 403);

    const result = await billingService.cancelSubscription(req.schoolId);
    sendSuccess({ res, message: result.message });
  }),
};

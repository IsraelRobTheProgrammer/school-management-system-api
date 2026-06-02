import { z } from "zod";

export const initializeSubscriptionSchema = z.object({
  body: z.object({
    plan: z.enum(["BASIC", "PREMIUM"]),
    billingInterval: z.enum(["MONTHLY", "TERMLY"]),
  }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({
    reference: z.string().min(1, "Payment reference is required"),
  }),
});

export type InitializeSubscriptionInput = z.infer<
  typeof initializeSubscriptionSchema
>["body"];

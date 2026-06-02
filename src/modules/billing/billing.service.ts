import { Plan, BillingInterval } from "@prisma/client";
import { prisma } from "../../config/database";
import { paystackClient, verifyWebhookSignature } from "../../config/paystack";
import { AppError } from "../../utils/AppError";
import { env } from "../../config/env";
import { InitializeSubscriptionInput } from "./billing.schema";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a plan + interval combo to the correct Paystack plan code
 * and amount from environment variables.
 * This is the single place that knows about pricing — so that we change env vars, not code.
 */
const getPlanConfig = (
  plan: Plan,
  interval: BillingInterval
): { paystackPlanCode: string; amountKobo: number } => {
  const configs: Record<string, { paystackPlanCode: string; amountKobo: number }> = {
    BASIC_MONTHLY: {
      paystackPlanCode: env.SMS_BASIC_MONTHLY_PLAN,
      amountKobo: env.SMS_BASIC_MONTHLY_AMOUNT,
    },
    BASIC_TERMLY: {
      paystackPlanCode: env.SMS_BASIC_TERMLY_PLAN,
      amountKobo: env.SMS_BASIC_TERMLY_AMOUNT,
    },
    PREMIUM_MONTHLY: {
      paystackPlanCode: env.SMS_PREMIUM_MONTHLY_PLAN,
      amountKobo: env.SMS_PREMIUM_MONTHLY_AMOUNT,
    },
    PREMIUM_TERMLY: {
      paystackPlanCode: env.SMS_PREMIUM_TERMLY_PLAN,
      amountKobo: env.SMS_PREMIUM_TERMLY_AMOUNT,
    },
  };

  const key = `${plan}_${interval}`;
  const config = configs[key];

  if (!config) {
    throw new AppError("Invalid plan and interval combo.", 400, "INVALID_PLAN");
  }

  return config;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const billingService = {
  /**
   * Step 1 of the payment flow.
   * Creates a pending invoice, calls Paystack to initialize a transaction,
   * and returns the authorization URL for the client to redirect to.
   */
  async initializeSubscription(
    schoolId: string,
    adminEmail: string,
    input: InitializeSubscriptionInput
  ) {
    const { plan, billingInterval } = input;
    const { paystackPlanCode, amountKobo } = getPlanConfig(
      plan as Plan,
      billingInterval as BillingInterval
    );

    // Generate a unique reference we can track
    const reference = `SCH-${schoolId.slice(0, 8)}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    // Create pending invoice — exists before payment so we can match the webhook
    await prisma.invoice.create({
      data: {
        schoolId,
        plan: plan as Plan,
        billingInterval: billingInterval as BillingInterval,
        amountKobo,
        paystackReference: reference,
        status: "PENDING",
      },
    });

    // Call Paystack — this never fails silently, paystackClient throws on error
    const paystackData = await paystackClient.initializeTransaction({
      email: adminEmail,
      amount: amountKobo,
      reference,
      plan: paystackPlanCode,
      metadata: {
        schoolId,
        plan,
        billingInterval,
        custom_fields: [
          { display_name: "School ID", variable_name: "school_id", value: schoolId },
          { display_name: "Plan", variable_name: "plan", value: plan },
        ],
      },
    });

    return {
      authorizationUrl: paystackData.authorization_url,
      reference,
      plan,
      billingInterval,
      amountKobo,
      amountNaira: amountKobo / 100,
    };
  },

  /**
   * Manual verification endpoint — fallback if the webhook was missed.
   * Verifies with Paystack directly and applies the same logic as the webhook handler.
   */
  async verifyPayment(schoolId: string, reference: string) {
    // Confirm this invoice belongs to this school (tenant isolation)
    const invoice = await prisma.invoice.findFirst({
      where: { paystackReference: reference, schoolId },
    });

    if (!invoice) {
      throw new AppError("Invoice not found.", 404, "NOT_FOUND");
    }

    if (invoice.status === "PAID") {
      return { alreadyPaid: true, message: "This payment has already been processed." };
    }

    // Ask Paystack for the truth
    const transaction = await paystackClient.verifyTransaction(reference);

    if (transaction.status !== "success") {
      throw new AppError(
        `Payment was not successful. Status: ${transaction.status}`,
        402,
        "PAYMENT_NOT_SUCCESSFUL"
      );
    }

    // Apply the same state changes as the webhook would
    await billingService.activateSubscription({
      schoolId,
      reference,
      plan: invoice.plan,
      billingInterval: invoice.billingInterval,
      amountKobo: transaction.amount,
      paystackCustomerCode: transaction.customer.customer_code,
      paystackSubscriptionCode: transaction.subscription?.subscription_code,
      paystackPlanCode: transaction.plan?.plan_code,
      channel: transaction.channel,
      paidAt: new Date(transaction.paid_at),
    });

    return { alreadyPaid: false, message: "Payment verified and subscription activated." };
  },

  /**
   * Core activation logic — shared between webhook handler and manual verify.
   * Updates invoice to PAID, upserts the subscription, upgrades school plan.
   * All in a single transaction — atomically consistent.
   */
  async activateSubscription(params: {
    schoolId: string;
    reference: string;
    plan: Plan;
    billingInterval: BillingInterval;
    amountKobo: number;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string;
    paystackPlanCode?: string;
    channel?: string;
    paidAt: Date;
  }) {
    const {
      schoolId, reference, plan, billingInterval,
      amountKobo, paystackCustomerCode, paystackSubscriptionCode,
      paystackPlanCode, channel, paidAt,
    } = params;

    // Calculate period dates
    const periodStart = new Date(paidAt);
    const periodEnd = new Date(paidAt);
    if (billingInterval === "MONTHLY") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      // TERMLY = 3 months
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    }

    await prisma.$transaction([
      // 1. Mark invoice as paid
      prisma.invoice.update({
        where: { paystackReference: reference },
        data: {
          status: "PAID",
          paystackChannel: channel,
          paidAt,
          periodStart,
          periodEnd,
        },
      }),

      // 2. Upsert subscription record
      prisma.subscription.upsert({
        where: { schoolId },
        create: {
          schoolId,
          plan,
          billingInterval,
          status: "ACTIVE",
          paystackCustomerCode,
          paystackSubscriptionCode,
          paystackPlanCode,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan,
          billingInterval,
          status: "ACTIVE",
          paystackCustomerCode,
          paystackSubscriptionCode,
          paystackPlanCode,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelledAt: null, // Clear any previous cancellation
        },
      }),

      // 3. Upgrade the school's plan — this is what unlocks premium features
      prisma.school.update({
        where: { id: schoolId },
        data: { plan },
      }),
    ]);
  },

  /**
   * Handles all incoming Paystack webhook events.
   * Called from the webhook route AFTER signature verification passes.
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    // Verify authenticity — reject anything that doesn't match
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new AppError("Invalid webhook signature.", 401, "INVALID_SIGNATURE");
    }

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      data: Record<string, unknown>;
    };

    switch (event.event) {
      case "charge.success": {
        const data = event.data as {
          reference: string;
          amount: number;
          channel: string;
          paid_at: string;
          customer: { customer_code: string };
          plan: { plan_code: string };
          subscription?: { subscription_code: string };
          metadata: { schoolId: string };
        };

        const schoolId = data.metadata?.schoolId;
        if (!schoolId) break; // Not a subscription charge we initiated

        const invoice = await prisma.invoice.findFirst({
          where: { paystackReference: data.reference, schoolId },
        });

        if (!invoice || invoice.status === "PAID") break; // Already processed

        await billingService.activateSubscription({
          schoolId,
          reference: data.reference,
          plan: invoice.plan,
          billingInterval: invoice.billingInterval,
          amountKobo: data.amount,
          paystackCustomerCode: data.customer.customer_code,
          paystackSubscriptionCode: data.subscription?.subscription_code,
          paystackPlanCode: data.plan?.plan_code,
          channel: data.channel,
          paidAt: new Date(data.paid_at),
        });
        break;
      }

      case "subscription.disable": {
        // School cancelled or payment failed too many times
        const data = event.data as {
          subscription_code: string;
          customer: { metadata?: { schoolId?: string } };
        };

        await prisma.subscription.updateMany({
          where: { paystackSubscriptionCode: data.subscription_code },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        // Downgrade school to BASIC
        const sub = await prisma.subscription.findFirst({
          where: { paystackSubscriptionCode: data.subscription_code },
        });
        if (sub) {
          await prisma.school.update({
            where: { id: sub.schoolId },
            data: { plan: "BASIC" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const data = event.data as { subscription: { subscription_code: string } };
        await prisma.subscription.updateMany({
          where: { paystackSubscriptionCode: data.subscription.subscription_code },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      case "invoice.create": {
        // Paystack created a renewal invoice — create our pending invoice record
        const data = event.data as {
          reference: string;
          amount: number;
          subscription: { subscription_code: string };
          customer: { metadata?: { schoolId?: string } };
        };

        const sub = await prisma.subscription.findFirst({
          where: { paystackSubscriptionCode: data.subscription.subscription_code },
        });

        if (sub) {
          await prisma.invoice.upsert({
            where: { paystackReference: data.reference },
            create: {
              schoolId: sub.schoolId,
              plan: sub.plan,
              billingInterval: sub.billingInterval,
              amountKobo: data.amount,
              paystackReference: data.reference,
              status: "PENDING",
            },
            update: {},
          });
        }
        break;
      }

      default:
        // Unknown event type — log and ignore, return 200 so Paystack stops retrying
        console.log(`[Webhook] Unhandled event: ${event.event}`);
    }
  },

  async getSubscriptionStatus(schoolId: string) {
    const [subscription, recentInvoices] = await Promise.all([
      prisma.subscription.findUnique({ where: { schoolId } }),
      prisma.invoice.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amountKobo: true,
          status: true,
          paidAt: true,
          periodStart: true,
          periodEnd: true,
          paystackReference: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      subscription: subscription
        ? {
            status: subscription.status,
            plan: subscription.plan,
            billingInterval: subscription.billingInterval,
            currentPeriodEnd: subscription.currentPeriodEnd,
            trialEndsAt: subscription.trialEndsAt,
            cancelledAt: subscription.cancelledAt,
          }
        : null,
      recentInvoices: recentInvoices.map((inv) => ({
        ...inv,
        amountNaira: inv.amountKobo / 100,
      })),
    };
  },

  async cancelSubscription(schoolId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { schoolId },
    });

    if (!subscription) {
      throw new AppError("No active subscription found.", 404, "NOT_FOUND");
    }

    if (subscription.status === "CANCELLED") {
      throw new AppError("Subscription is already cancelled.", 400, "ALREADY_CANCELLED");
    }

    // Mark as cancelled in our DB immediately
    // Paystack will also send a subscription.disable webhook to confirm
    await prisma.subscription.update({
      where: { schoolId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Downgrade plan
    await prisma.school.update({
      where: { id: schoolId },
      data: { plan: "BASIC" },
    });

    return { message: "Subscription cancelled. Your access will continue until the end of the current billing period." };
  },
};

import { env } from "./env";
import crypto from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Central Paystack HTTP client.
 * All requests are authenticated with the secret key.
 * Throws descriptive errors on non-2xx responses.
 */
async function paystackRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = (await response.json()) as { status: boolean; message: string; data: T };

  if (!response.ok || !data.status) {
    throw new Error(`Paystack error: ${data.message}`);
  }

  return data.data;
}

// ─── Typed response shapes ────────────────────────────────────────────────────

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number; // in kobo
  channel: string;
  paid_at: string;
  customer: { email: string; customer_code: string };
  plan: { plan_code: string };
  subscription?: { subscription_code: string };
}

export interface PaystackSubscription {
  subscription_code: string;
  status: string;
  next_payment_date: string;
  plan: { plan_code: string; name: string; interval: string };
  customer: { customer_code: string; email: string };
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const paystackClient = {
  /**
   * Initialize a transaction — returns a URL to redirect the user to.
   * We use Paystack's hosted payment page so we never touch card details.
   */
  initializeTransaction(params: {
    email: string;
    amount: number; // kobo
    reference: string;
    plan: string; // Paystack plan code
    metadata?: Record<string, unknown>;
    callback_url?: string;
  }) {
    return paystackRequest<PaystackInitializeResponse>(
      "POST",
      "/transaction/initialize",
      {
        ...params,
        callback_url:
          params.callback_url ?? `${env.FRONTEND_URL}/billing/callback`,
      }
    );
  },

  /**
   * Verify a transaction by reference.
   * Used by the manual verification endpoint as a fallback if webhook was missed.
   */
  verifyTransaction(reference: string) {
    return paystackRequest<PaystackVerifyResponse>(
      "GET",
      `/transaction/verify/${reference}`
    );
  },

  /**
   * Fetch a subscription from Paystack by its code.
   */
  fetchSubscription(subscriptionCode: string) {
    return paystackRequest<PaystackSubscription>(
      "GET",
      `/subscription/${subscriptionCode}`
    );
  },

  /**
   * Disable (cancel) a subscription on Paystack.
   * Requires the subscription code and email token (sent to customer's email).
   * For server-side cancellation we use the subscription code + customer code.
   */
  cancelSubscription(subscriptionCode: string, emailToken: string) {
    return paystackRequest<{ message: string }>("POST", "/subscription/disable", {
      code: subscriptionCode,
      token: emailToken,
    });
  },
};

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verifies that a webhook request genuinely came from Paystack.
 * Paystack signs the raw body with your secret key using HMAC SHA512.
 * We recompute the hash and compare — if they match, the request is authentic.
 *
 * NB: This must receive the RAW request body (Buffer), not parsed JSON.
 * The webhook route will use the express.raw() middleware.
 */
export const verifyWebhookSignature = (
  rawBody: Buffer,
  signature: string
): boolean => {
  const hash = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
};

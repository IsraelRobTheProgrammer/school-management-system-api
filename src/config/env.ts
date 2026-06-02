import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default("v1"),

  // Database
  DATABASE_URL: z.string({
    required_error: "DATABASE_URL is required",
  }),

  // JWT
  JWT_ACCESS_SECRET: z.string({
    required_error: "JWT_ACCESS_SECRET is required",
  }),
  JWT_REFRESH_SECRET: z.string({
    required_error: "JWT_REFRESH_SECRET is required",
  }),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // CORS
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string({ required_error: "PAYSTACK_SECRET_KEY is required" }),
  PAYSTACK_PUBLIC_KEY: z.string({ required_error: "PAYSTACK_PUBLIC_KEY is required" }),
  SMS_BASIC_MONTHLY_PLAN: z.string({ required_error: "SMS_BASIC_MONTHLY_PLAN is required" }),
  SMS_BASIC_TERMLY_PLAN: z.string({ required_error: "SMS_BASIC_TERMLY_PLAN is required" }),
  SMS_PREMIUM_MONTHLY_PLAN: z.string({ required_error: "SMS_PREMIUM_MONTHLY_PLAN is required" }),
  SMS_PREMIUM_TERMLY_PLAN: z.string({ required_error: "SMS_PREMIUM_TERMLY_PLAN is required" }),
  SMS_BASIC_MONTHLY_AMOUNT: z.coerce.number().default(1000000),
  SMS_BASIC_TERMLY_AMOUNT: z.coerce.number().default(2700000),
  SMS_PREMIUM_MONTHLY_AMOUNT: z.coerce.number().default(2500000),
  SMS_PREMIUM_TERMLY_AMOUNT: z.coerce.number().default(6750000),

  // Frontend
  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

// This will throw a clear, descriptive error at startup if any var is missing
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Derived helpers
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

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

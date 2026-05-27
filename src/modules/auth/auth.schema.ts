import { z } from "zod";

export const registerSchoolSchema = z.object({
  body: z.object({
    // School details
    schoolName: z.string().min(2, "School name must be at least 2 characters"),
    subdomain: z
      .string()
      .min(3, "Subdomain must be at least 3 characters")
      .max(32, "Subdomain must be at most 32 characters")
      .regex(
        /^[a-z0-9-]+$/,
        "Subdomain can only contain lowercase letters, numbers, and hyphens"
      ),
    schoolEmail: z.string().email("Invalid school email").optional(),
    schoolPhone: z.string().optional(),
    address: z.string().optional(),

    // First admin account
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    adminEmail: z.string().email("Invalid admin email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>["body"];

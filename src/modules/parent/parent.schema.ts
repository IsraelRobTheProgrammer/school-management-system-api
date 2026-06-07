import { z } from "zod";

export const registerParentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Last name is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    phone: z.string().optional(),
    inviteCode: z.string().min(6, "Invite code is required"),
  }),
});

export type RegisterParentInput = z.infer<typeof registerParentSchema>["body"];

import { z } from "zod";

export const createTeacherSchema = z.object({
  body: z.object({
    // User account details
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),

    // Teacher-specific details
    employeeId: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const updateTeacherSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    employeeId: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
  }),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>["body"];
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>["body"];

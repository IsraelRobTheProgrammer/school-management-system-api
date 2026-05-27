import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    // User account
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),

    // Student details
    admissionNumber: z.string().min(1, "Admission number is required"),
    classId: z.string().uuid("Invalid class ID").optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),

    // Guardian info
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    guardianEmail: z.string().email().optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    classId: z.string().uuid().optional().nullable(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    guardianEmail: z.string().email().optional(),
  }),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>["body"];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>["body"];

import { z } from "zod";

export const createGradeSchema = z.object({
  body: z.object({
    studentId: z.string().uuid("Invalid student ID"),
    subjectId: z.string().uuid("Invalid subject ID"),
    classId: z.string().uuid("Invalid class ID"),
    term: z.enum(["FIRST", "SECOND", "THIRD"]),
    academicYear: z
      .string()
      .regex(/^\d{4}\/\d{4}$/, "Academic year must be in format YYYY/YYYY (e.g. 2024/2025)"),
    caScore: z
      .number()
      .min(0, "CA score cannot be negative")
      .max(40, "CA score cannot exceed 40"),
    examScore: z
      .number()
      .min(0, "Exam score cannot be negative")
      .max(60, "Exam score cannot exceed 60"),
    comment: z.string().max(500).optional(),
  }),
});

export const updateGradeSchema = z.object({
  body: z.object({
    caScore: z.number().min(0).max(40).optional(),
    examScore: z.number().min(0).max(60).optional(),
    comment: z.string().max(500).optional(),
  }),
});

export const gradeQuerySchema = z.object({
  query: z.object({
    studentId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    term: z.enum(["FIRST", "SECOND", "THIRD"]).optional(),
    academicYear: z.string().optional(),
  }),
});

export type CreateGradeInput = z.infer<typeof createGradeSchema>["body"];
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>["body"];
export type GradeQuery = z.infer<typeof gradeQuerySchema>["query"];

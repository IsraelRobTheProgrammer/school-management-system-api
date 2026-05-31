import { z } from "zod";

export const createSubjectSchema = z.object({
  body: z.object({
    classId: z.string().uuid("Invalid class ID"),
    name: z.string().min(1, "Subject name is required"),
    code: z.string().optional(),
  }),
});

export const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
  }),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>["body"];
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>["body"];

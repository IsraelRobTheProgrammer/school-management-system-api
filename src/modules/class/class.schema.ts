import { z } from "zod";

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Class name is required"),
    level: z.string().min(1, "Level is required"),
    description: z.string().optional(),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    description: z.string().optional(),
    classTeacherId: z.string().uuid("Invalid teacher ID").optional(),
  }),
});

export type CreateClassInput = z.infer<typeof createClassSchema>["body"];
export type UpdateClassInput = z.infer<typeof updateClassSchema>["body"];

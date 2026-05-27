import { z } from "zod";

export const updateSchoolSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    logoUrl: z.string().url().optional(),
  }),
});

export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>["body"];

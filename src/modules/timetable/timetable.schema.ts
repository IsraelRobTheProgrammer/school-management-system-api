import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM 24-hour format

export const createTimetableSchema = z.object({
  body: z.object({
    classId: z.string().uuid("Invalid class ID"),
    subjectId: z.string().uuid("Invalid subject ID"),
    teacherId: z.string().uuid("Invalid teacher ID"),
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format (e.g. 08:00)"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format (e.g. 09:00)"),
  }).refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  }),
});

export const updateTimetableSchema = z.object({
  body: z.object({
    teacherId: z.string().uuid().optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
  }),
});

export type CreateTimetableInput = z.infer<typeof createTimetableSchema>["body"];
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>["body"];

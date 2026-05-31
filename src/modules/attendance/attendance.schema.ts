import { z } from "zod";

// Single attendance record
const attendanceEntrySchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  note: z.string().optional(),
});

// Bulk attendance — take attendance for a whole class at once
export const recordAttendanceSchema = z.object({
  body: z.object({
    classId: z.string().uuid("Invalid class ID"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    records: z
      .array(attendanceEntrySchema)
      .min(1, "At least one attendance record is required"),
  }),
});

// Update a single record
export const updateAttendanceSchema = z.object({
  body: z.object({
    status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
    note: z.string().optional(),
  }),
});

export const attendanceQuerySchema = z.object({
  query: z.object({
    classId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>["body"];
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>["body"];
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>["query"];

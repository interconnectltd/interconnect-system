import { z } from "zod/v4";

export const syncCalendarSchema = z.object({
  connection_id: z.string().uuid().optional(),
});

export const calendarEventsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type SyncCalendarInput = z.infer<typeof syncCalendarSchema>;
export type CalendarEventsQuery = z.infer<typeof calendarEventsQuerySchema>;

export const availabilityRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  is_active: z.boolean().default(true),
});

export const availabilityRulesUpdateSchema = z.object({
  rules: z.array(availabilityRuleSchema),
});

export const availabilityOverrideSchema = z.object({
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  override_type: z.enum(["block", "custom"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const suggestSchema = z.object({
  target_user_id: z.string().uuid("無効なユーザーIDです"),
  duration_min: z.number().int().min(15).max(180).default(30),
});

export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>;
export type AvailabilityRulesUpdate = z.infer<typeof availabilityRulesUpdateSchema>;
export type AvailabilityOverride = z.infer<typeof availabilityOverrideSchema>;
export type SuggestInput = z.infer<typeof suggestSchema>;

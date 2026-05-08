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

// Strict HH:MM (00:00–23:59). Loose `\d{2}:\d{2}` accepted invalid times like 25:99.
const HHMM_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const HHMM_MESSAGE = "HH:MM形式 (00:00〜23:59) で入力してください";

export const availabilityRuleSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(HHMM_REGEX, HHMM_MESSAGE),
    end_time: z.string().regex(HHMM_REGEX, HHMM_MESSAGE),
    is_active: z.boolean().default(true),
  })
  .refine((r) => r.start_time < r.end_time, {
    message: "start_timeはend_timeより前に設定してください",
    path: ["end_time"],
  });

export const availabilityRulesUpdateSchema = z.object({
  rules: z.array(availabilityRuleSchema).max(50),
});

export const availabilityOverrideSchema = z.object({
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  override_type: z.enum(["block", "custom"]),
  start_time: z.string().regex(HHMM_REGEX, HHMM_MESSAGE).optional(),
  end_time: z.string().regex(HHMM_REGEX, HHMM_MESSAGE).optional(),
});

export const suggestSchema = z.object({
  target_user_id: z.string().uuid("無効なユーザーIDです"),
  duration_min: z.number().int().min(15).max(180).default(30),
});

// POST /api/v1/calendar/ics/subscribe
export const icsSubscribeSchema = z.object({
  ics_url: z
    .string()
    .trim()
    .url("有効なURLを入力してください")
    .max(2048, "URLが長すぎます")
    .refine((u) => u.startsWith("https://"), {
      message: "URLは https:// で始まる必要があります",
    }),
});

export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>;
export type AvailabilityRulesUpdate = z.infer<typeof availabilityRulesUpdateSchema>;
export type AvailabilityOverride = z.infer<typeof availabilityOverrideSchema>;
export type SuggestInput = z.infer<typeof suggestSchema>;
export type IcsSubscribeInput = z.infer<typeof icsSubscribeSchema>;

import { z } from "zod/v4";

const PLATFORMS = ["zoom", "google_meet"] as const;

/**
 * POST /api/v1/scheduling/confirm — 日時確定 + 会議作成
 *
 * scheduled_at: ISO 8601 datetime, must be in the future.
 * duration_min: 5–480 minutes (8h cap).
 * meeting_url: optional URL.
 * chat_room_id: optional UUID.
 */
export const schedulingConfirmSchema = z.object({
  target_user_id: z.string().uuid("有効な相手のIDが必要です"),
  scheduled_at: z
    .string()
    .datetime({ message: "scheduled_atは有効なISO 8601日時で指定してください" })
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: "過去の日時は指定できません",
    }),
  duration_min: z
    .number()
    .int()
    .min(5, "duration_minは5〜480の範囲で指定してください")
    .max(480, "duration_minは5〜480の範囲で指定してください")
    .default(30),
  platform: z.enum(PLATFORMS).optional(),
  meeting_url: z
    .string()
    .url("meeting_urlは有効なURLを指定してください")
    .max(2048)
    .optional(),
  chat_room_id: z.string().uuid("chat_room_idが無効です").optional(),
});

export type SchedulingConfirmInput = z.infer<typeof schedulingConfirmSchema>;

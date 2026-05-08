import { z } from "zod/v4";

/**
 * Body schema for POST /api/v1/chat/rooms.
 *
 * `connection_id` must be a valid UUID. The route handler additionally
 * verifies that the connection exists, is accepted, and that the
 * authenticated user is one of its two parties.
 */
export const createChatRoomSchema = z.object({
  connection_id: z.string().uuid(),
});

export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;

/** Aligned with chat_messages.content_type CHECK in migration 00007. */
export const CHAT_CONTENT_TYPES = [
  "text",
  "image",
  "file",
  "scheduling_card",
  "meeting_suggestion",
  "meeting_confirmed",
] as const;

/**
 * POST /api/v1/chat/rooms/:roomId/messages
 *
 * - content: trimmed, 1〜5000 chars
 * - content_type: must match the DB CHECK constraint, optional (defaults to 'text' at DB layer)
 */
export const postChatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "メッセージ内容が必要です")
    .max(5000, "メッセージは5000文字以内で入力してください"),
  content_type: z.enum(CHAT_CONTENT_TYPES).optional(),
});

export type PostChatMessageInput = z.infer<typeof postChatMessageSchema>;

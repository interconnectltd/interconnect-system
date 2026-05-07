import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";
import {
  shouldCheckIntent,
  hasRecentSuggestion,
  detectMeetingIntent,
} from "@/lib/chat/meeting-detector";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { user } = await withAuth();
    const { roomId } = await params;

    if (!isValidUUID(roomId)) {
      return jsonError(400, "BAD_REQUEST", "無効なルームIDです");
    }

    const serviceClient = await createServiceClient();

    // Verify current user is a member of the room
    const { data: room, error: roomError } = await serviceClient
      .from("chat_rooms")
      .select("id, user_a_id, user_b_id")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) throw roomError;

    if (!room) {
      return jsonError(404, "NOT_FOUND", "チャットルームが見つかりません");
    }

    if (room.user_a_id !== user.id && room.user_b_id !== user.id) {
      return jsonError(403, "FORBIDDEN", "このチャットルームにアクセスする権限がありません");
    }

    // Cursor pagination using created_at
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");

    let query = serviceClient
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: messages, error: msgError } = await query;
    if (msgError) throw msgError;

    // Fetch sender profiles
    const senderIds = [...new Set(messages?.map((m) => m.sender_id) ?? [])];
    const { data: profiles } = await serviceClient
      .from("user_profiles")
      .select("id, name, avatar_url")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const enriched = (messages ?? []).map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null,
    }));

    const nextCursor =
      messages && messages.length === 50
        ? messages[messages.length - 1]!.created_at
        : null;

    return json({ messages: enriched, next_cursor: nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { user } = await withAuth();
    const { roomId } = await params;

    if (!isValidUUID(roomId)) {
      return jsonError(400, "BAD_REQUEST", "無効なルームIDです");
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError(400, "BAD_REQUEST", "リクエストボディが不正です");
    }

    const { content, content_type } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return jsonError(400, "BAD_REQUEST", "メッセージ内容が必要です");
    }

    const serviceClient = await createServiceClient();

    // Verify current user is a member of the room
    const { data: room, error: roomError } = await serviceClient
      .from("chat_rooms")
      .select("id, user_a_id, user_b_id")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) throw roomError;

    if (!room) {
      return jsonError(404, "NOT_FOUND", "チャットルームが見つかりません");
    }

    if (room.user_a_id !== user.id && room.user_b_id !== user.id) {
      return jsonError(403, "FORBIDDEN", "このチャットルームにアクセスする権限がありません");
    }

    const trimmedContent = content.trim();
    const preview = trimmedContent.length > 100
      ? trimmedContent.slice(0, 100) + "…"
      : trimmedContent;

    // Insert message
    const { data: message, error: insertError } = await serviceClient
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: trimmedContent,
        ...(content_type ? { content_type } : {}),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update chat_rooms with last message info
    const { error: updateError } = await serviceClient
      .from("chat_rooms")
      .update({
        last_message_at: message.created_at,
        last_message_preview: preview,
      })
      .eq("id", roomId);

    if (updateError) throw updateError;

    // Create notification for the other user
    const otherUserId =
      room.user_a_id === user.id ? room.user_b_id : room.user_a_id;

    // Fetch sender name for notification message
    const { data: sender } = await serviceClient
      .from("user_profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    await serviceClient.from("notifications").insert({
      user_id: otherUserId,
      type: "chat_message",
      title: "新しいメッセージ",
      message: `${sender?.name ?? "メンバー"}さんからメッセージが届きました`,
      link: `/chat?room=${roomId}`,
    });

    // Fire-and-forget: detect meeting intent without blocking the response
    const contentTypeForDetection = content_type ?? "text";
    if (shouldCheckIntent(trimmedContent, contentTypeForDetection)) {
      // Run asynchronously — do NOT await
      (async () => {
        try {
          if (await hasRecentSuggestion(roomId, 1)) return;

          const svc = await createServiceClient();

          // Fetch last 5 messages for context
          const { data: recentMessages } = await svc
            .from("chat_messages")
            .select("content, sender_id")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(5);

          const result = await detectMeetingIntent(
            (recentMessages ?? []).reverse(),
            trimmedContent,
          );

          const shouldSuggest =
            (result.intent === "confirmed" && result.confidence >= 0.8) ||
            (result.intent === "proposed" && result.confidence >= 0.5);

          if (shouldSuggest) {
            // Resolve the peer (target_user_id) so the card can POST
            // /meetings/from-chat without an extra round-trip.
            const peerId =
              room.user_a_id === user.id ? room.user_b_id : room.user_a_id;

            await svc.from("chat_messages").insert({
              room_id: roomId,
              sender_id: user.id,
              content_type: "meeting_suggestion",
              content: JSON.stringify({
                intent: result.intent,
                datetime: result.datetime,
                platform: result.platform,
                confidence: result.confidence,
                triggered_by: message.id,
                target_user_id: peerId,
                duration_min: 30,
              }),
            });
          }
        } catch (err) {
          console.error("[meeting-detector] async detection failed:", err);
        }
      })();
    }

    return json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

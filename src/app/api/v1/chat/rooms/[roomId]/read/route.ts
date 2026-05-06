import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
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

    // Count unread messages before updating
    const { count } = await serviceClient
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    // Mark all unread messages from other user as read
    const { error: updateError } = await serviceClient
      .from("chat_messages")
      .update({ is_read: true })
      .eq("room_id", roomId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    if (updateError) throw updateError;

    return json({ updated: count ?? 0 });
  } catch (error) {
    return handleApiError(error);
  }
}

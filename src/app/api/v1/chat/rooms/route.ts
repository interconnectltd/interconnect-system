import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { createRoomFromConnection } from "./_post-handler";
import { createChatRoomSchema } from "@/validations/chat";

interface PeerProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface ChatRoomSummary {
  id: string;
  peer: PeerProfile;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export async function GET() {
  try {
    const { user } = await withAuth();
    const serviceClient = await createServiceClient();

    // Fetch all rooms involving the current user, newest activity first.
    const { data: rooms, error: roomsError } = await serviceClient
      .from("chat_rooms")
      .select(
        "id, user_a_id, user_b_id, last_message_at, last_message_preview, created_at",
      )
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (roomsError) throw roomsError;

    const roomList = rooms ?? [];

    if (roomList.length === 0) {
      return json({ rooms: [] satisfies ChatRoomSummary[] });
    }

    // Resolve the peer (other user) for each room.
    const peerIds = Array.from(
      new Set(
        roomList.map((r) => (r.user_a_id === user.id ? r.user_b_id : r.user_a_id)),
      ),
    );

    const { data: profiles, error: profilesError } = await serviceClient
      .from("user_profiles")
      .select("id, name, avatar_url")
      .in("id", peerIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        { id: p.id, name: p.name, avatar_url: p.avatar_url } satisfies PeerProfile,
      ]),
    );

    // Compute unread counts in parallel: messages in room from peer that are unread.
    const unreadCounts = await Promise.all(
      roomList.map(async (room) => {
        const { count } = await serviceClient
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("sender_id", user.id)
          .eq("is_read", false);
        return { roomId: room.id, count: count ?? 0 };
      }),
    );

    const unreadMap = new Map(unreadCounts.map((u) => [u.roomId, u.count]));

    const summaries: ChatRoomSummary[] = roomList.map((room) => {
      const peerId = room.user_a_id === user.id ? room.user_b_id : room.user_a_id;
      const peer = profileMap.get(peerId) ?? {
        id: peerId,
        name: null,
        avatar_url: null,
      };
      return {
        id: room.id,
        peer,
        last_message_preview: room.last_message_preview,
        last_message_at: room.last_message_at,
        unread_count: unreadMap.get(room.id) ?? 0,
      };
    });

    return json({ rooms: summaries });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/chat/rooms — Create (or fetch) a chat room from an accepted
 * connection. Idempotent: returns the existing room if one exists for the
 * given connection_id.
 */
export async function POST(request: Request) {
  try {
    const { user } = await withAuth();

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = createChatRoomSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_FAILED",
        "リクエストの検証に失敗しました",
      );
    }

    try {
      const { roomId } = await createRoomFromConnection(
        parsed.data.connection_id,
        user.id,
      );
      return json({ room_id: roomId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("BAD_REQUEST"))
        return jsonError(400, "BAD_REQUEST", msg);
      if (msg.startsWith("NOT_FOUND"))
        return jsonError(404, "NOT_FOUND", msg);
      if (msg.startsWith("FORBIDDEN"))
        return jsonError(403, "FORBIDDEN", msg);
      throw e;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

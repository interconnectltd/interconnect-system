import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_PLATFORMS = ["zoom", "google_meet"] as const;

/** POST /api/v1/scheduling/confirm — 日時確定 + 会議作成 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await withAuth();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError(400, "BAD_REQUEST", "リクエストボディが不正です");
    }

    // --- 1. バリデーション ---
    const { target_user_id, scheduled_at, duration_min, platform, meeting_url, chat_room_id } = body;

    if (!target_user_id || !isValidUUID(target_user_id)) {
      return jsonError(400, "BAD_REQUEST", "有効な相手のIDが必要です");
    }

    if (target_user_id === user.id) {
      return jsonError(400, "BAD_REQUEST", "自分自身との会議は作成できません");
    }

    if (!scheduled_at || typeof scheduled_at !== "string") {
      return jsonError(400, "BAD_REQUEST", "日時（scheduled_at）が必要です");
    }

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return jsonError(400, "BAD_REQUEST", "scheduled_atは有効なISO日時文字列で指定してください");
    }

    if (scheduledDate.getTime() < Date.now()) {
      return jsonError(400, "BAD_REQUEST", "過去の日時は指定できません");
    }

    const duration = typeof duration_min === "number" ? duration_min : 30;
    if (duration < 5 || duration > 480) {
      return jsonError(400, "BAD_REQUEST", "duration_minは5〜480の範囲で指定してください");
    }

    if (platform && !VALID_PLATFORMS.includes(platform)) {
      return jsonError(
        400,
        "BAD_REQUEST",
        `platformは${VALID_PLATFORMS.join(", ")}のいずれかを指定してください`,
      );
    }

    if (meeting_url) {
      try {
        new URL(meeting_url);
      } catch {
        return jsonError(400, "BAD_REQUEST", "meeting_urlは有効なURLを指定してください");
      }
    }

    if (chat_room_id && !isValidUUID(chat_room_id)) {
      return jsonError(400, "BAD_REQUEST", "chat_room_idが無効です");
    }

    // --- 2. ユーザー存在 + 接続チェック ---
    const [{ data: target }, { data: requester }] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, name")
        .eq("id", target_user_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("id, name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (!target) {
      return jsonError(404, "NOT_FOUND", "対象のユーザーが見つかりません");
    }

    // 接続ステータスの確認（accepted or reaccepted）
    const { data: connection } = await supabase
      .from("connections")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${target_user_id}),and(user_id.eq.${target_user_id},connected_user_id.eq.${user.id})`,
      )
      .maybeSingle();

    if (!connection || (connection.status !== "accepted" && connection.status !== "reaccepted")) {
      return jsonError(403, "FORBIDDEN", "接続済みのユーザーとのみ会議を作成できます");
    }

    const serviceClient = await createServiceClient();

    // --- 3. meeting_requests レコード作成 ---
    const { data: meetingRequest, error: reqError } = await serviceClient
      .from("meeting_requests")
      .insert({
        requester_id: user.id,
        target_id: target_user_id,
        status: "confirmed",
        proposed_times: [scheduled_at],
        message: null,
      })
      .select()
      .single();

    if (reqError) throw reqError;

    // --- 4. meetings レコード作成 ---
    const requesterName = requester?.name ?? "メンバー";
    const targetName = target.name ?? "メンバー";

    const { data: meeting, error: meetingError } = await serviceClient
      .from("meetings")
      .insert({
        request_id: meetingRequest.id,
        title: `${requesterName} × ${targetName}`,
        scheduled_at,
        duration_min: duration,
        status: "confirmed",
        platform: platform ?? null,
        meeting_url: meeting_url ?? null,
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // --- 5. 参加者レコード作成 ---
    const { error: participantsError } = await serviceClient
      .from("meeting_participants_v2")
      .insert([
        { meeting_id: meeting.id, user_id: user.id, role: "requester" },
        { meeting_id: meeting.id, user_id: target_user_id, role: "target" },
      ]);

    if (participantsError) throw participantsError;

    // --- 6. 両ユーザーに会議確定通知 ---
    const formattedDate = scheduledDate.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    await serviceClient.from("notifications").insert([
      {
        user_id: target_user_id,
        type: "meeting_confirmed",
        title: "会議が確定しました",
        message: `${requesterName}さんとの会議が確定しました（${formattedDate}、${duration}分間）`,
        link: "/meetings",
      },
      {
        user_id: user.id,
        type: "meeting_confirmed",
        title: "会議が確定しました",
        message: `${targetName}さんとの会議が確定しました（${formattedDate}、${duration}分間）`,
        link: "/meetings",
      },
    ]);

    // --- 7. チャットルームにシステムメッセージ挿入 ---
    if (chat_room_id) {
      // チャットルームの存在と参加者チェック
      const { data: room } = await serviceClient
        .from("chat_rooms")
        .select("id, user_a_id, user_b_id")
        .eq("id", chat_room_id)
        .maybeSingle();

      if (room) {
        const isParticipant =
          (room.user_a_id === user.id && room.user_b_id === target_user_id) ||
          (room.user_a_id === target_user_id && room.user_b_id === user.id);

        if (isParticipant) {
          const meetingDetails = [
            `日時: ${formattedDate}`,
            `時間: ${duration}分`,
            ...(platform ? [`プラットフォーム: ${platform === "zoom" ? "Zoom" : "Google Meet"}`] : []),
            ...(meeting_url ? [`会議リンク: ${meeting_url}`] : []),
          ].join("\n");

          await serviceClient.from("chat_messages").insert({
            room_id: chat_room_id,
            sender_id: user.id,
            content: meetingDetails,
            content_type: "meeting_confirmed",
          });

          // チャットルームの最終メッセージを更新
          await serviceClient
            .from("chat_rooms")
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: `会議が確定しました（${formattedDate}）`,
            })
            .eq("id", chat_room_id);
        }
      }
    }

    // --- 8. レスポンス ---
    return json(meeting, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { syncCalendar } from "@/lib/calendar/service";
import type { ConnectionRecord } from "@/lib/calendar/types";

/** POST /api/v1/calendar/sync — カレンダー手動同期 (全プロバイダー対応) */
export async function POST() {
  try {
    const { user, supabase } = await withAuth();

    // ユーザーのアクティブなカレンダー接続を取得
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connError) throw connError;
    if (!connection) {
      return jsonError(404, "NOT_FOUND", "カレンダーが連携されていません");
    }

    const serviceClient = await createServiceClient();

    // Use the unified CalendarService which handles token refresh + provider dispatch
    const { result, tokenUpdate } = await syncCalendar(
      connection as ConnectionRecord,
    );

    // Persist refreshed tokens if any
    if (tokenUpdate) {
      await serviceClient
        .from("calendar_connections")
        .update({
          access_token_enc: tokenUpdate.accessTokenEnc,
          token_expires_at: tokenUpdate.tokenExpiresAt,
        })
        .eq("id", connection.id);
    }

    // 接続ユーザー全員のメールを取得して is_interconnect 判定に使用
    const { data: allProfiles } = await serviceClient
      .from("user_profiles")
      .select("id, email")
      .eq("is_active", true);

    const emailToUserId = new Map<string, string>();
    for (const p of allProfiles ?? []) {
      if (p.email) {
        emailToUserId.set(p.email.toLowerCase(), p.id);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Upsert normalized events into calendar_events
    for (const event of result.events) {
      if (event.status === "cancelled") {
        skipped++;
        continue;
      }

      const attendeeEmails = event.attendeeEmails;

      // is_interconnect: 参加者の中にINTERCONNECTユーザーがいるか判定
      const isInterconnect = attendeeEmails.some((email) => {
        const matchedId = emailToUserId.get(email);
        return matchedId && matchedId !== user.id;
      });

      const row = {
        connection_id: connection.id,
        user_id: user.id,
        external_event_id: event.externalId,
        title: event.title,
        start_at: event.startAt,
        end_at: event.endAt,
        video_url: event.videoUrl,
        video_platform: event.videoPlatform,
        attendee_emails: attendeeEmails,
        is_interconnect: isInterconnect,
        etag: event.etag,
      };

      const { error, status } = await serviceClient
        .from("calendar_events")
        .upsert(row, { onConflict: "connection_id,external_event_id" });

      if (error) {
        console.error("Failed to upsert calendar event:", error);
        skipped++;
      } else {
        if (status === 201) created++;
        else updated++;
      }
    }

    // sync_cursor と last_synced_at を更新
    const updatePayload: Record<string, string> = {
      last_synced_at: new Date().toISOString(),
    };
    if (result.nextSyncCursor) {
      updatePayload.sync_cursor = result.nextSyncCursor;
    }

    await serviceClient
      .from("calendar_connections")
      .update(updatePayload)
      .eq("id", connection.id);

    return json({
      synced: result.events.length,
      created,
      updated,
      skipped,
      sync_cursor_updated: !!result.nextSyncCursor,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

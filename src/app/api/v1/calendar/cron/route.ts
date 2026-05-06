import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncCalendar } from "@/lib/calendar/service";
import type { ConnectionRecord } from "@/lib/calendar/types";

/**
 * GET /api/v1/calendar/cron
 *
 * Vercel Cron handler: syncs ALL active calendar connections.
 * Runs every 15 minutes. Idempotent and safe to run multiple times.
 */
export async function GET(request: NextRequest) {
  // --- Auth: verify the request comes from Vercel Cron ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/calendar] CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const serviceClient = await createServiceClient();

  // Fetch all active calendar connections
  const { data: connections, error: connError } = await serviceClient
    .from("calendar_connections")
    .select("*")
    .eq("is_active", true);

  if (connError) {
    console.error("[cron/calendar] Failed to fetch connections:", connError);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 },
    );
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ synced: 0, errors: 0, skipped: 0 });
  }

  // Fetch all active user profiles once for is_interconnect detection
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

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (const connection of connections) {
    try {
      // Use the unified CalendarService which handles token refresh + sync
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

      // Upsert normalized events into calendar_events
      for (const event of result.events) {
        if (event.status === "cancelled") {
          skipped++;
          continue;
        }

        const attendeeEmails = event.attendeeEmails;
        const isInterconnect = attendeeEmails.some((email) => {
          const matchedId = emailToUserId.get(email);
          return matchedId && matchedId !== connection.user_id;
        });

        const row = {
          connection_id: connection.id,
          user_id: connection.user_id,
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

        const { error: upsertError } = await serviceClient
          .from("calendar_events")
          .upsert(row, { onConflict: "connection_id,external_event_id" });

        if (upsertError) {
          console.error(
            `[cron/calendar] Upsert failed for event ${event.externalId}:`,
            upsertError,
          );
        }
      }

      // Update sync cursor and last_synced_at
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

      synced++;
      console.log(
        `[cron/calendar] Synced connection ${connection.id} (${connection.provider}): ${result.events.length} events`,
      );
    } catch (err) {
      errors++;
      console.error(
        `[cron/calendar] Failed to sync connection ${connection.id}:`,
        err,
      );
      // Continue with the next connection — don't fail the whole batch
    }
  }

  return NextResponse.json({ synced, errors, skipped });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Zoom Webhook Receiver — Agent A recording ingestion
// ---------------------------------------------------------------------------

const ZOOM_WEBHOOK_SECRET = () => process.env.ZOOM_WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** HMAC-SHA256 hex digest */
function hmacSha256Hex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Verify Zoom webhook signature.
 * @see https://developers.zoom.us/docs/api/rest/webhook-reference/#verify-webhook-events
 */
function verifySignature(
  requestTimestamp: string | null,
  requestBody: string,
  signature: string | null,
): boolean {
  const secret = ZOOM_WEBHOOK_SECRET();
  if (!secret || !requestTimestamp || !signature) return false;

  const message = `v0:${requestTimestamp}:${requestBody}`;
  const expected = `v0=${hmacSha256Hex(message, secret)}`;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(signature, "utf-8"),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler (no withAuth — webhook auth via signature)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const secret = ZOOM_WEBHOOK_SECRET();
    if (!secret) {
      return jsonError(500, "CONFIG_ERROR", "Zoom webhook secret not configured");
    }

    // Read raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // ------------------------------------------------------------------
    // 1. Zoom endpoint URL validation challenge
    // ------------------------------------------------------------------
    if (body.event === "endpoint.url_validation") {
      const challenge = (body.payload as Record<string, unknown>)?.plainToken as string;
      if (!challenge) {
        return jsonError(400, "BAD_REQUEST", "Missing plainToken in challenge");
      }
      return json({
        plainToken: challenge,
        encryptedToken: hmacSha256Hex(challenge, secret),
      });
    }

    // ------------------------------------------------------------------
    // 2. Signature verification for all other events
    // ------------------------------------------------------------------
    const timestamp = request.headers.get("x-zm-request-timestamp");
    const signature = request.headers.get("x-zm-signature");

    if (!verifySignature(timestamp, rawBody, signature)) {
      return jsonError(401, "UNAUTHORIZED", "Invalid webhook signature");
    }

    const event = body.event as string;

    // ------------------------------------------------------------------
    // 3. recording.completed — main flow
    // ------------------------------------------------------------------
    if (event === "recording.completed") {
      return await handleRecordingCompleted(body);
    }

    // ------------------------------------------------------------------
    // 4. meeting.started / meeting.ended — log only for now
    // ------------------------------------------------------------------
    if (event === "meeting.started" || event === "meeting.ended") {
      const payload = body.payload as Record<string, unknown>;
      const obj = payload?.object as Record<string, unknown> | undefined;
      console.log(
        `[zoom-webhook] ${event}: meeting_id=${obj?.id}, topic=${obj?.topic}`,
      );
      return json({ handled: true, event });
    }

    // ------------------------------------------------------------------
    // 5. Unknown event
    // ------------------------------------------------------------------
    return jsonError(400, "UNKNOWN_EVENT", `Unhandled event type: ${event}`);
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// recording.completed handler
// ---------------------------------------------------------------------------

async function handleRecordingCompleted(
  body: Record<string, unknown>,
) {
  const payload = body.payload as Record<string, unknown>;
  const object = payload?.object as Record<string, unknown> | undefined;
  if (!object) {
    return jsonError(400, "BAD_REQUEST", "Missing payload.object");
  }

  const zoomMeetingId = String(object.id ?? "");
  const downloadToken = (body.download_token ?? payload?.download_token ?? "") as string;

  // Find the audio/video recording file
  const recordingFiles = (object.recording_files ?? []) as Array<
    Record<string, unknown>
  >;
  const audioFile = recordingFiles.find(
    (f) =>
      f.file_type === "M4A" ||
      f.file_type === "MP4" ||
      f.recording_type === "audio_only",
  );

  if (!audioFile) {
    console.log(
      `[zoom-webhook] recording.completed: no audio/video file found for zoom meeting ${zoomMeetingId}`,
    );
    return json({ handled: true, event: "recording.completed", skipped: true });
  }

  const downloadUrl = audioFile.download_url as string;

  const supabase = await createServiceClient();

  // ------------------------------------------------------------------
  // Look up meeting in INTERCONNECT's meetings table by meeting_url
  // ------------------------------------------------------------------
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, meeting_url, status")
    .like("meeting_url", `%${zoomMeetingId}%`)
    .limit(1)
    .maybeSingle();

  if (meeting) {
    // Fetch participant user IDs
    const { data: participants } = await supabase
      .from("meeting_participants_v2")
      .select("user_id")
      .eq("meeting_id", meeting.id);

    const participantIds = (participants ?? []).map((p) => p.user_id);

    // Enqueue ingest job (job_queue table added by Agent A migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: queueError } = await (supabase as any).from("job_queue").insert({
      job_type: "ingest",
      payload: {
        meeting_id: meeting.id,
        recording_url: downloadUrl,
        recording_token: downloadToken,
        participant_ids: participantIds,
        source: "zoom",
        zoom_meeting_id: zoomMeetingId,
      },
    });

    if (queueError) {
      console.error("[zoom-webhook] Failed to enqueue ingest job:", queueError);
    }

    console.log(
      `[zoom-webhook] recording.completed: enqueued ingest for meeting ${meeting.id} (zoom=${zoomMeetingId}, participants=${participantIds.length})`,
    );

    return json({
      handled: true,
      event: "recording.completed",
      meetingId: meeting.id,
      participants: participantIds.length,
    });
  }

  // ------------------------------------------------------------------
  // Fallback: check calendar_events for is_interconnect=true
  // ------------------------------------------------------------------
  const { data: calendarEvent } = await supabase
    .from("calendar_events")
    .select("id, video_url, linked_meeting_id, user_id")
    .eq("is_interconnect", true)
    .like("video_url", `%${zoomMeetingId}%`)
    .limit(1)
    .maybeSingle();

  if (calendarEvent) {
    console.log(
      `[zoom-webhook] recording.completed: found calendar_event ${calendarEvent.id} for zoom meeting ${zoomMeetingId} (no linked meeting yet)`,
    );

    // If there's a linked meeting, enqueue via that
    if (calendarEvent.linked_meeting_id) {
      const { data: participants } = await supabase
        .from("meeting_participants_v2")
        .select("user_id")
        .eq("meeting_id", calendarEvent.linked_meeting_id);

      const participantIds = (participants ?? []).map((p) => p.user_id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("job_queue").insert({
        job_type: "ingest",
        payload: {
          meeting_id: calendarEvent.linked_meeting_id,
          recording_url: downloadUrl,
          recording_token: downloadToken,
          participant_ids: participantIds,
          source: "zoom",
          zoom_meeting_id: zoomMeetingId,
          calendar_event_id: calendarEvent.id,
        },
      });

      return json({
        handled: true,
        event: "recording.completed",
        calendarEventId: calendarEvent.id,
        linkedMeetingId: calendarEvent.linked_meeting_id,
      });
    }

    return json({
      handled: true,
      event: "recording.completed",
      calendarEventId: calendarEvent.id,
      noLinkedMeeting: true,
    });
  }

  // ------------------------------------------------------------------
  // Not found in either table — log and acknowledge
  // ------------------------------------------------------------------
  console.log(
    `[zoom-webhook] recording.completed: no matching meeting/event for zoom meeting ${zoomMeetingId}`,
  );

  return json({
    handled: true,
    event: "recording.completed",
    matched: false,
    zoomMeetingId,
  });
}

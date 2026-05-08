import { withAuth, json, jsonError, handleApiError } from "@/lib/api-helpers";
import { createServiceClient } from "@/lib/supabase/server";

interface CalendarAttendee {
  email: string;
  name: string | null;
  response_status: string | null;
}

interface CalendarEventResponse {
  id: string;
  title: string | null;
  start: string;
  end: string;
  duration_min: number | null;
  platform: string | null;
  video_url: string | null;
  is_interconnect: boolean;
  recording_enabled: boolean;
  attendees: CalendarAttendee[];
}

/**
 * GET /api/v1/calendar/events?from=ISO&to=ISO
 *
 * Returns the authenticated user's synced calendar events overlapping the
 * [from, to] window. Shape matches the calendar page's CalendarEvent type:
 *   - start/end (not start_at/end_at)
 *   - duration_min derived from end - start
 *   - attendee_emails normalized to attendees[] of {email, name, response_status}
 */
export async function GET(request: Request) {
  try {
    const { user } = await withAuth();

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!fromParam || Number.isNaN(Date.parse(fromParam))) {
      return jsonError(400, "BAD_REQUEST", "fromの日付形式が不正です");
    }

    if (!toParam || Number.isNaN(Date.parse(toParam))) {
      return jsonError(400, "BAD_REQUEST", "toの日付形式が不正です");
    }

    const fromIso = new Date(fromParam).toISOString();
    const toIso = new Date(toParam).toISOString();

    const serviceClient = await createServiceClient();

    const { data: events, error } = await serviceClient
      .from("calendar_events")
      .select(
        "id, title, start_at, end_at, video_url, video_platform, attendee_emails, is_interconnect, recording_enabled",
      )
      .eq("user_id", user.id)
      .gte("start_at", fromIso)
      .lte("start_at", toIso)
      .order("start_at", { ascending: true });

    if (error) throw error;

    const response: CalendarEventResponse[] = (events ?? []).map((row) => {
      const startMs = new Date(row.start_at).getTime();
      const endMs = new Date(row.end_at).getTime();
      const durationMin =
        Number.isFinite(startMs) && Number.isFinite(endMs)
          ? Math.max(0, Math.round((endMs - startMs) / 60000))
          : null;

      // attendee_emails is Json | null in the DB. The sync writer always stores
      // a string[] so we normalize to that here while staying defensive.
      const rawEmails = row.attendee_emails;
      const emails: string[] = Array.isArray(rawEmails)
        ? rawEmails.filter((e): e is string => typeof e === "string")
        : [];

      const attendees: CalendarAttendee[] = emails.map((email) => ({
        email,
        name: null,
        response_status: null,
      }));

      return {
        id: row.id,
        title: row.title,
        start: row.start_at,
        end: row.end_at,
        duration_min: durationMin,
        platform: row.video_platform,
        video_url: row.video_url,
        is_interconnect: row.is_interconnect,
        recording_enabled: row.recording_enabled,
        attendees,
      };
    });

    return json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

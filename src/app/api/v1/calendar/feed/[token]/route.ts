import { validateFeedToken } from "@/lib/calendar/feed-token";
import { createServiceClient } from "@/lib/supabase/server";
import type { ICSMeetingData } from "@/lib/calendar/ics-email";

/**
 * GET /api/v1/calendar/feed/:token
 *
 * ICS カレンダーフィード — 外部カレンダーアプリからの購読用
 * トークンで認証（withAuth 不要）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const validated = validateFeedToken(token);
    if (!validated) {
      return new Response("Invalid or expired feed token", { status: 403 });
    }
    const { userId, version } = validated;

    const supabase = await createServiceClient();

    // Per-user revocation: トークン内 version が DB の現行 version と一致するか確認
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("feed_token_version")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("Feed: failed to fetch token version", profileErr);
      return new Response("Internal error", { status: 500 });
    }

    const currentVersion =
      (profile as { feed_token_version: number | null } | null)
        ?.feed_token_version ?? 1;

    if (version !== currentVersion) {
      return new Response(
        "このフィードURLは無効になりました。新しいURLは設定画面で取得してください。",
        { status: 410 },
      );
    }

    // ユーザーが参加している confirmed 会議を取得
    const { data: participantRows, error: pError } = await supabase
      .from("meeting_participants_v2")
      .select("meeting_id")
      .eq("user_id", userId);

    if (pError) {
      console.error("Feed: failed to fetch participants", pError);
      return new Response("Internal error", { status: 500 });
    }

    if (!participantRows || participantRows.length === 0) {
      return buildCalendarResponse([]);
    }

    const meetingIds = participantRows.map((r) => r.meeting_id);

    const { data: meetings, error: mError } = await supabase
      .from("meetings")
      .select(
        "id, title, scheduled_at, duration_min, meeting_url, platform, status",
      )
      .in("id", meetingIds)
      .eq("status", "confirmed")
      .not("scheduled_at", "is", null);

    if (mError) {
      console.error("Feed: failed to fetch meetings", mError);
      return new Response("Internal error", { status: 500 });
    }

    // 各会議の参加者名を一括取得
    const confirmedIds = (meetings ?? []).map((m) => m.id);
    let participantsByMeeting: Record<string, string[]> = {};

    if (confirmedIds.length > 0) {
      const { data: allParticipants } = await supabase
        .from("meeting_participants_v2")
        .select("meeting_id, user_id, user_profiles(name, email:id)")
        .in("meeting_id", confirmedIds);

      if (allParticipants) {
        participantsByMeeting = {};
        for (const p of allParticipants) {
          const mid = p.meeting_id as string;
          const profile = p.user_profiles as unknown as { name: string | null } | null;
          const name = profile?.name ?? "参加者";
          if (!participantsByMeeting[mid]) participantsByMeeting[mid] = [];
          participantsByMeeting[mid].push(name);
        }
      }
    }

    const meetingDataList: ICSMeetingData[] = (meetings ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      scheduled_at: m.scheduled_at!,
      duration_min: m.duration_min,
      platform: m.platform,
      meeting_url: m.meeting_url,
      status: m.status,
      participants: participantsByMeeting[m.id] ?? [],
    }));

    return buildCalendarResponse(meetingDataList);
  } catch (error) {
    console.error("Feed: unexpected error", error);
    return new Response("Internal error", { status: 500 });
  }
}

// ─── ICS generation helpers ───────────────────────────────────────────

/** ICSテキストのエスケープ (RFC 5545) */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** UTC日時をICS形式 (YYYYMMDDTHHmmssZ) に変換 */
function formatDt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  slack: "Slack",
  other: "その他",
};

function buildVEvent(m: ICSMeetingData, now: Date): string {
  const start = new Date(m.scheduled_at);
  const durationMin = m.duration_min ?? 30;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const title = m.title ?? "INTERCONNECT ミーティング";

  const descParts: string[] = [];
  if (m.platform) {
    descParts.push(
      `プラットフォーム: ${PLATFORM_LABELS[m.platform] ?? m.platform}`,
    );
  }
  if (m.meeting_url) {
    descParts.push(`会議リンク: ${m.meeting_url}`);
  }
  if (m.participants && m.participants.length > 0) {
    descParts.push(`参加者: ${m.participants.join(", ")}`);
  }
  descParts.push("INTERCONNECT で作成された会議");
  const description = descParts.join("\\n");

  const lines = [
    "BEGIN:VEVENT",
    `UID:${m.id}@interconnect.app`,
    `DTSTAMP:${formatDt(now)}`,
    `DTSTART:${formatDt(start)}`,
    `DTEND:${formatDt(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(m.meeting_url
      ? [`LOCATION:${escapeIcsText(m.meeting_url)}`]
      : []),
    ...(m.meeting_url ? [`URL:${escapeIcsText(m.meeting_url)}`] : []),
    `STATUS:CONFIRMED`,
    "END:VEVENT",
  ];

  return lines.join("\r\n");
}

function buildCalendarResponse(meetings: ICSMeetingData[]): Response {
  const now = new Date();

  const vevents = meetings.map((m) => buildVEvent(m, now)).join("\r\n");

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//INTERCONNECT//CalendarFeed//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:INTERCONNECT ミーティング",
    ...(vevents ? [vevents] : []),
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, max-age=900",
    },
  });
}

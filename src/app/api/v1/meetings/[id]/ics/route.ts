import { withAuth, jsonError, handleApiError } from "@/lib/api-helpers";
import { isValidUUID } from "@/lib/sanitize";
import { createServiceClient } from "@/lib/supabase/server";

/** GET /api/v1/meetings/[id]/ics — ICSファイルダウンロード */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return jsonError(400, "BAD_REQUEST", "無効なIDです");

    const { user, supabase } = await withAuth();

    // 参加者チェック
    const { data: participant } = await supabase
      .from("meeting_participants_v2")
      .select("meeting_id")
      .eq("meeting_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participant) {
      return jsonError(403, "FORBIDDEN", "この会議にアクセスする権限がありません");
    }

    // 会議詳細取得
    const serviceClient = await createServiceClient();
    const { data: meeting, error } = await serviceClient
      .from("meetings")
      .select("id, title, scheduled_at, duration_min, meeting_url, platform, status")
      .eq("id", id)
      .single();

    if (error || !meeting) {
      return jsonError(404, "NOT_FOUND", "会議が見つかりません");
    }

    if (!meeting.scheduled_at) {
      return jsonError(400, "BAD_REQUEST", "日程が未定の会議です");
    }

    // 参加者名を取得
    const { data: participants } = await serviceClient
      .from("meeting_participants_v2")
      .select("user_id, user_profiles(name, email:id)")
      .eq("meeting_id", id);

    // ICS生成
    const start = new Date(meeting.scheduled_at);
    const durationMin = meeting.duration_min ?? 30;
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    const now = new Date();

    const title = meeting.title ?? "INTERCONNECT ミーティング";

    const platformLabels: Record<string, string> = {
      zoom: "Zoom",
      google_meet: "Google Meet",
      teams: "Microsoft Teams",
      slack: "Slack",
      other: "その他",
    };

    const descriptionParts: string[] = [];
    if (meeting.platform) {
      descriptionParts.push(
        `プラットフォーム: ${platformLabels[meeting.platform] ?? meeting.platform}`,
      );
    }
    if (meeting.meeting_url) {
      descriptionParts.push(`会議リンク: ${meeting.meeting_url}`);
    }
    if (participants && participants.length > 0) {
      const names = participants
        .map((p: Record<string, unknown>) => {
          const profile = p.user_profiles as { name: string | null } | null;
          return profile?.name ?? "参加者";
        })
        .join(", ");
      descriptionParts.push(`参加者: ${names}`);
    }
    descriptionParts.push("INTERCONNECT で作成された会議");
    const description = descriptionParts.join("\\n");

    const formatDt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const vevent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//INTERCONNECT//Meeting//JP",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${meeting.id}@interconnect.app`,
      `DTSTAMP:${formatDt(now)}`,
      `DTSTART:${formatDt(start)}`,
      `DTEND:${formatDt(end)}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      ...(meeting.meeting_url
        ? [`LOCATION:${escapeIcsText(meeting.meeting_url)}`]
        : []),
      ...(meeting.meeting_url
        ? [`URL:${escapeIcsText(meeting.meeting_url)}`]
        : []),
      `STATUS:${meeting.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(vevent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="meeting-${meeting.id}.ics"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** ICSテキストのエスケープ (RFC 5545) */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

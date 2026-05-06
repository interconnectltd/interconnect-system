/**
 * ICS コンテンツ生成ヘルパー（メール添付用）
 * meetings/[id]/ics/route.ts と同じ VEVENT ロジックを純粋関数として提供
 */

export interface ICSMeetingData {
  id: string;
  title: string | null;
  scheduled_at: string;
  duration_min: number | null;
  platform: string | null;
  meeting_url: string | null;
  status?: string;
  participants?: string[];
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  slack: "Slack",
  other: "その他",
};

/** ICSテキストのエスケープ (RFC 5545) */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** UTC日時をICS形式 (YYYYMMDDTHHmmssZ) に変換 */
function formatIcsDatetime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 会議情報の説明文を組み立て */
function buildDescription(meeting: ICSMeetingData): string {
  const parts: string[] = [];
  if (meeting.platform) {
    parts.push(
      `プラットフォーム: ${PLATFORM_LABELS[meeting.platform] ?? meeting.platform}`,
    );
  }
  if (meeting.meeting_url) {
    parts.push(`会議リンク: ${meeting.meeting_url}`);
  }
  if (meeting.participants && meeting.participants.length > 0) {
    parts.push(`参加者: ${meeting.participants.join(", ")}`);
  }
  parts.push("INTERCONNECT で作成された会議");
  return parts.join("\\n");
}

/**
 * VCALENDAR 文字列を生成する純粋関数
 * メール添付やダウンロードなど、様々な用途に使用可能
 */
export function generateICSContent(meeting: ICSMeetingData): string {
  const start = new Date(meeting.scheduled_at);
  const durationMin = meeting.duration_min ?? 30;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const now = new Date();

  const title = meeting.title ?? "INTERCONNECT ミーティング";
  const description = buildDescription(meeting);
  const icsStatus =
    meeting.status === "confirmed" ? "CONFIRMED" : "TENTATIVE";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//INTERCONNECT//Meeting//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@interconnect.app`,
    `DTSTAMP:${formatIcsDatetime(now)}`,
    `DTSTART:${formatIcsDatetime(start)}`,
    `DTEND:${formatIcsDatetime(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(meeting.meeting_url
      ? [`LOCATION:${escapeIcsText(meeting.meeting_url)}`]
      : []),
    ...(meeting.meeting_url
      ? [`URL:${escapeIcsText(meeting.meeting_url)}`]
      : []),
    `STATUS:${icsStatus}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * カレンダー追加URL生成ヘルパー
 * Google Calendar / Outlook / ICS ダウンロード用
 */

export interface MeetingData {
  id: string;
  title: string | null;
  scheduled_at: string;
  duration_min: number | null;
  platform: string | null;
  meeting_url: string | null;
  participants?: string[];
}

/** UTC日時をGoogle Calendar用フォーマット (YYYYMMDDTHHmmssZ) に変換 */
function toGoogleDateFormat(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 終了時刻を計算 */
function getEndTime(scheduledAt: string, durationMin: number | null): Date {
  const start = new Date(scheduledAt);
  return new Date(start.getTime() + (durationMin ?? 30) * 60 * 1000);
}

/** ISO形式 (Outlook用) */
function toOutlookDateFormat(iso: string): string {
  return new Date(iso).toISOString();
}

function buildDescription(meeting: MeetingData): string {
  const parts: string[] = [];
  if (meeting.platform) {
    const labels: Record<string, string> = {
      zoom: "Zoom",
      google_meet: "Google Meet",
      teams: "Microsoft Teams",
      slack: "Slack",
      other: "その他",
    };
    parts.push(`プラットフォーム: ${labels[meeting.platform] ?? meeting.platform}`);
  }
  if (meeting.meeting_url) {
    parts.push(`会議リンク: ${meeting.meeting_url}`);
  }
  if (meeting.participants && meeting.participants.length > 0) {
    parts.push(`参加者: ${meeting.participants.join(", ")}`);
  }
  parts.push("INTERCONNECT で作成された会議");
  return parts.join("\n");
}

/**
 * Google Calendar の「イベント作成」URLを生成
 * @see https://calendar.google.com/calendar/r/eventedit
 */
export function generateGoogleCalendarUrl(meeting: MeetingData): string {
  const endTime = getEndTime(meeting.scheduled_at, meeting.duration_min);
  const dates = `${toGoogleDateFormat(meeting.scheduled_at)}/${toGoogleDateFormat(endTime.toISOString())}`;

  const params = new URLSearchParams({
    text: meeting.title ?? "INTERCONNECT ミーティング",
    dates,
    details: buildDescription(meeting),
  });

  if (meeting.meeting_url) {
    params.set("location", meeting.meeting_url);
  }

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

/**
 * Outlook.com の「イベント作成」URLを生成
 * @see https://outlook.live.com/calendar/0/deeplink/compose
 */
export function generateOutlookCalendarUrl(meeting: MeetingData): string {
  const endTime = getEndTime(meeting.scheduled_at, meeting.duration_min);

  const params = new URLSearchParams({
    subject: meeting.title ?? "INTERCONNECT ミーティング",
    startdt: toOutlookDateFormat(meeting.scheduled_at),
    enddt: toOutlookDateFormat(endTime.toISOString()),
    body: buildDescription(meeting),
    path: "/calendar/action/compose",
    rru: "addevent",
  });

  if (meeting.meeting_url) {
    params.set("location", meeting.meeting_url);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

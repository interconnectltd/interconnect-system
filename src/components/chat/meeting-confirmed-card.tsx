"use client";

import { CalendarDays, CheckCircle2, Download, ExternalLink, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MeetingConfirmedData = {
  meeting_id: string;
  scheduled_at: string; // ISO 8601
  platform: string | null;
  meeting_url: string | null;
};

const DATETIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDatetime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATETIME_FORMATTER.format(d);
}

function platformLabel(platform: string | null): string {
  if (!platform) return "未指定";
  if (platform === "zoom") return "Zoom";
  if (platform === "google_meet" || platform === "meet") return "Google Meet";
  return platform;
}

export default function MeetingConfirmedCard({
  data,
}: {
  data: MeetingConfirmedData;
}) {
  const icsHref = `/api/v1/meetings/${data.meeting_id}/ics`;

  return (
    <Card className="w-full max-w-md border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ミーティング確定
        </p>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="tabular-nums">
              {formatDatetime(data.scheduled_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Video
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{platformLabel(data.platform)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild type="button" size="sm" variant="outline">
            <a href={icsHref} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              カレンダーに追加
            </a>
          </Button>
          {data.meeting_url ? (
            <Button asChild type="button" size="sm">
              <a
                href={data.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                リンクを開く
              </a>
            </Button>
          ) : (
            <Button type="button" size="sm" disabled>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              リンクを開く
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

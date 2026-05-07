"use client";

/**
 * Single row in the meetings list.
 *
 * Marked client-side because the ICS download uses an `<a download href>`
 * link which streams the file directly from the GET endpoint — keeping it
 * inside a client component lets us layer in toasts/loading state later
 * without restructuring the list. The row remains lightweight: no fetch,
 * no state, just presentation.
 */

import Link from "next/link";
import { Calendar, Download, ExternalLink, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface MeetingRowData {
  id: string;
  title: string | null;
  scheduledAt: string; // ISO
  durationMin: number | null;
  platform: string | null;
  meetingUrl: string | null;
  peerName: string | null;
}

const TZ_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const PLATFORM_LABEL: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Teams",
  in_person: "対面",
};

export function MeetingRow({ meeting }: { meeting: MeetingRowData }) {
  const when = TZ_FORMATTER.format(new Date(meeting.scheduledAt));
  const platformLabel = meeting.platform
    ? (PLATFORM_LABEL[meeting.platform] ?? meeting.platform)
    : null;
  const headline = meeting.title ?? meeting.peerName ?? "会議";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{headline}</h3>
            {platformLabel ? (
              <Badge variant="secondary" className="shrink-0">
                <Video className="mr-1 h-3 w-3" aria-hidden />
                {platformLabel}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" aria-hidden />
            <span>{when}</span>
            {meeting.durationMin ? (
              <span className="text-muted-foreground/80">
                ・{meeting.durationMin}分
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {meeting.meetingUrl ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={meeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                会議を開く
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <a
              href={`/api/v1/meetings/${meeting.id}/ics`}
              download
            >
              <Download className="h-4 w-4" aria-hidden />
              カレンダーに追加
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

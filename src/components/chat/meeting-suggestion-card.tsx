"use client";

import { useState } from "react";
import { CalendarDays, Video, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiClientError } from "@/lib/api-client";

type Intent = "confirmed" | "proposed" | "none";

type MeetingSuggestionData = {
  intent: Intent;
  datetime: string | null; // ISO 8601
  platform: "zoom" | "meet" | null;
  confidence: number;
  triggered_by: string;
  // Optional but required by the server when actually creating the meeting.
  // Agent A populates these when it builds the message payload.
  target_user_id?: string;
  duration_min?: number;
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

function formatDatetime(iso: string | null): string {
  if (!iso) return "日時未確定";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "日時未確定";
  return DATETIME_FORMATTER.format(d);
}

function platformLabel(platform: "zoom" | "meet" | null): string {
  if (platform === "zoom") return "Zoom";
  if (platform === "meet") return "Google Meet";
  return "未指定";
}

// API expects "google_meet", local payload uses "meet".
function platformForApi(
  platform: "zoom" | "meet" | null,
): "zoom" | "google_meet" | undefined {
  if (platform === "zoom") return "zoom";
  if (platform === "meet") return "google_meet";
  return undefined;
}

export default function MeetingSuggestionCard({
  data,
  roomId,
}: {
  data: MeetingSuggestionData;
  roomId: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [created, setCreated] = useState(false);

  if (dismissed) return null;

  const isProposed = data.intent === "proposed";

  async function handleCreate() {
    if (!data.datetime) {
      toast.error("日時が確定していません");
      return;
    }
    if (!data.target_user_id) {
      toast.error("相手の情報が取得できませんでした");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/meetings/from-chat", {
        target_user_id: data.target_user_id,
        scheduled_at: data.datetime,
        duration_min: data.duration_min ?? 30,
        platform: platformForApi(data.platform),
        chat_room_id: roomId,
      });
      toast.success("ミーティングを作成しました");
      setCreated(true);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "ミーティングの作成に失敗しました";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setDismissed(true);
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium">ミーティングを作成しますか？</p>

        {isProposed ? (
          <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            確定ですか？ AIが推測した日時です
          </p>
        ) : null}

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="tabular-nums">{formatDatetime(data.datetime)}</span>
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
          <Button
            type="button"
            size="sm"
            disabled={submitting || created || !data.datetime}
            onClick={handleCreate}
          >
            {created ? "作成済み" : submitting ? "作成中..." : "作成する"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={submitting || created}
            onClick={handleCancel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            キャンセル
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

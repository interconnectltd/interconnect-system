"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Suggestion = {
  date: string; // ISO date "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  score: number;
};

type SchedulingCardData = {
  suggestions: Suggestion[];
  targetUserId: string;
  roomId: string;
  durationMin: number;
};

type Platform = "zoom" | "google_meet";

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

function formatSuggestionDate(dateIso: string): string {
  // Treat the date string as Asia/Tokyo local date — append a noon time so
  // timezone offset doesn't roll the date back/forward.
  const ref = new Date(`${dateIso}T12:00:00+09:00`);
  if (Number.isNaN(ref.getTime())) return dateIso;
  return DATE_FORMATTER.format(ref);
}

function buildScheduledAtIso(date: string, time: string): string {
  // date "YYYY-MM-DD", time "HH:MM" — both in Asia/Tokyo
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

export default function SchedulingCard({
  data,
}: {
  data: SchedulingCardData;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const candidates = (data.suggestions ?? []).slice(0, 3);

  async function handleConfirm() {
    if (selectedIndex === null) return;
    const choice = candidates[selectedIndex];
    if (!choice) return;

    setSubmitting(true);
    try {
      const scheduledAt = buildScheduledAtIso(choice.date, choice.start);
      const platform: Platform = "zoom";

      await api.post("/scheduling/confirm", {
        target_user_id: data.targetUserId,
        scheduled_at: scheduledAt,
        duration_min: data.durationMin,
        platform,
        chat_room_id: data.roomId,
      });

      toast.success("日程を確定しました");
      setConfirmed(true);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "日程の確定に失敗しました";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleProposeOther() {
    toast.info("近日対応予定");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          日程調整
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">おすすめの日時:</p>
          <ul className="space-y-1.5">
            {candidates.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                候補がありません
              </li>
            ) : (
              candidates.map((s, i) => {
                const isSelected = selectedIndex === i;
                const Icon = isSelected ? CheckCircle2 : Circle;
                return (
                  <li key={`${s.date}-${s.start}-${i}`}>
                    <button
                      type="button"
                      onClick={() =>
                        !confirmed && !submitting && setSelectedIndex(i)
                      }
                      disabled={confirmed || submitting}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent",
                        (confirmed || submitting) && "opacity-60",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      <span className="tabular-nums">
                        {formatSuggestionDate(s.date)} {s.start}〜{s.end}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={selectedIndex === null || submitting || confirmed}
            onClick={handleConfirm}
          >
            {confirmed
              ? "確定済み"
              : submitting
                ? "確定中..."
                : "この日程で決定"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={submitting || confirmed}
            onClick={handleProposeOther}
          >
            別の日時を提案
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

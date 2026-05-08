"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type SchedulingSuggestion = {
  date: string;
  start: string;
  end: string;
};

type ScoredSuggestion = SchedulingSuggestion & {
  score: number;
};

type SuggestResponse = {
  suggestions: ScoredSuggestion[];
};

type SchedulingSuggestionsProps = {
  targetUserId: string;
  targetUserName?: string;
  durationMin?: number;
  onSelect?: (suggestion: SchedulingSuggestion) => void;
  compact?: boolean;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

function formatSuggestionDate(dateIso: string): string {
  const ref = new Date(`${dateIso}T12:00:00+09:00`);
  if (Number.isNaN(ref.getTime())) return dateIso;
  return DATE_FORMATTER.format(ref);
}

function fetchSuggestions(
  targetUserId: string,
  durationMin: number,
): Promise<SuggestResponse> {
  return api.post<SuggestResponse>("/scheduling/suggest", {
    target_user_id: targetUserId,
    duration_min: durationMin,
  });
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <ul className="space-y-1.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-md border border-input px-3 py-2"
        >
          <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="h-4 w-40 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

export default function SchedulingSuggestions({
  targetUserId,
  targetUserName,
  durationMin = 30,
  onSelect,
  compact = false,
}: SchedulingSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<SuggestResponse, ApiClientError>({
    queryKey: ["scheduling-suggestions", targetUserId, durationMin],
    queryFn: () => fetchSuggestions(targetUserId, durationMin),
    enabled: Boolean(targetUserId),
    staleTime: 60_000,
    retry: 1,
  });

  const suggestions = (data?.suggestions ?? []).slice(0, 3);
  const hasOnSelect = typeof onSelect === "function";

  function handleConfirm() {
    if (selectedIndex === null) return;
    const choice = suggestions[selectedIndex];
    if (!choice) return;

    if (!hasOnSelect) {
      toast.warning(
        "この場面では日程確定がサポートされていません。チャット画面からお試しください。",
      );
      return;
    }

    const { date, start, end } = choice;
    onSelect?.({ date, start, end });
  }

  const headerTitle = targetUserName
    ? `${targetUserName}さんとの日程候補`
    : "日程候補";

  const innerPaddingClass = compact ? "p-4" : "p-6";
  const headerPaddingClass = compact ? "p-4 pb-2" : "p-6 pb-3";
  const contentPaddingClass = compact ? "p-4 pt-0" : "p-6 pt-0";
  const titleSizeClass = compact ? "text-sm" : "text-base";

  if (isError) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : "候補の取得に失敗しました";
    // Surface the error via toast on render is noisy. Show inline + retry.
    return (
      <Card className="w-full">
        <CardContent className={cn(innerPaddingClass, "space-y-3")}>
          <p className="text-sm text-destructive">{message}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              toast.dismiss();
              void refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {!compact ? (
        <CardHeader className={headerPaddingClass}>
          <CardTitle
            className={cn("flex items-center gap-2", titleSizeClass)}
          >
            <CalendarDays
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            {headerTitle}
          </CardTitle>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          compact ? contentPaddingClass : "p-6 pt-0",
          "space-y-4",
        )}
      >
        {isLoading ? (
          <SkeletonRows count={3} />
        ) : suggestions.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              提案できる日時が見つかりませんでした
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center text-sm text-primary underline-offset-4 hover:underline"
            >
              空き時間設定を確認
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => {
                const isSelected = selectedIndex === i;
                const Icon = isSelected ? CheckCircle2 : Circle;
                return (
                  <li key={`${s.date}-${s.start}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      <span className="tabular-nums">
                        {formatSuggestionDate(s.date)} {s.start}〜{s.end}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size={compact ? "sm" : "default"}
                disabled={selectedIndex === null || (compact && !hasOnSelect)}
                onClick={handleConfirm}
              >
                この日程で打診
              </Button>
              {isFetching ? (
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    aria-hidden="true"
                  />
                  更新中
                </span>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

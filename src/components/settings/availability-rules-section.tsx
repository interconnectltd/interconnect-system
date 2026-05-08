"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface RuleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// API uses 0=日, 1=月, ..., 6=土. UI shows 月→日.
const DAY_ORDER: Array<{ day_of_week: number; label: string }> = [
  { day_of_week: 1, label: "月" },
  { day_of_week: 2, label: "火" },
  { day_of_week: 3, label: "水" },
  { day_of_week: 4, label: "木" },
  { day_of_week: 5, label: "金" },
  { day_of_week: 6, label: "土" },
  { day_of_week: 0, label: "日" },
];

const DEFAULT_START = "10:00";
const DEFAULT_END = "17:00";

function buildInitialRows(rules: AvailabilityRule[] | undefined): RuleRow[] {
  return DAY_ORDER.map(({ day_of_week }) => {
    const existing = rules?.find(
      (rule) => rule.day_of_week === day_of_week && rule.is_active,
    );
    return {
      day_of_week,
      start_time: existing ? existing.start_time.slice(0, 5) : DEFAULT_START,
      end_time: existing ? existing.end_time.slice(0, 5) : DEFAULT_END,
      is_active: Boolean(existing),
    };
  });
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export function AvailabilityRulesSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["availability-rules"],
    queryFn: () => api.get<AvailabilityRule[]>("/scheduling/rules"),
  });

  const [rows, setRows] = useState<RuleRow[]>(() => buildInitialRows(undefined));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setRows(buildInitialRows(data));
      setHydrated(true);
    }
  }, [data, hydrated]);

  const mutation = useMutation({
    mutationFn: async (payload: RuleRow[]) => {
      const rulesToSend = payload
        .filter((row) => row.is_active)
        .map((row) => ({
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          is_active: true,
        }));
      return api.put<AvailabilityRule[]>("/scheduling/rules", {
        rules: rulesToSend,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["availability-rules"], updated);
      toast.success("空き時間を保存しました");
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "空き時間の保存に失敗しました";
      toast.error(message);
    },
  });

  function updateRow(day_of_week: number, patch: Partial<RuleRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.day_of_week === day_of_week ? { ...row, ...patch } : row,
      ),
    );
  }

  function handleSave() {
    for (const row of rows) {
      if (!row.is_active) continue;
      if (!isValidTime(row.start_time) || !isValidTime(row.end_time)) {
        toast.error("時刻はHH:MM形式で入力してください");
        return;
      }
      if (row.start_time >= row.end_time) {
        toast.error("開始時刻は終了時刻より前にしてください");
        return;
      }
    }
    mutation.mutate(rows);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {DAY_ORDER.map((d) => (
              <div
                key={d.day_of_week}
                className="h-10 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-destructive">
            空き時間ルールの取得に失敗しました
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          チェックを入れた曜日に、指定した時間帯を「空き時間」として登録します
        </p>
        <div className="space-y-2">
          {rows.map((row) => {
            const dayLabel = DAY_ORDER.find(
              (d) => d.day_of_week === row.day_of_week,
            )?.label;
            const checkboxId = `availability-day-${row.day_of_week}`;
            const startId = `availability-start-${row.day_of_week}`;
            const endId = `availability-end-${row.day_of_week}`;
            return (
              <div
                key={row.day_of_week}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3"
              >
                <div className="flex w-20 items-center gap-2">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
                    checked={row.is_active}
                    onChange={(event) =>
                      updateRow(row.day_of_week, {
                        is_active: event.target.checked,
                      })
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {dayLabel}
                  </Label>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Label htmlFor={startId} className="sr-only">
                    {dayLabel} 開始時刻
                  </Label>
                  <Input
                    id={startId}
                    type="time"
                    value={row.start_time}
                    disabled={!row.is_active}
                    onChange={(event) =>
                      updateRow(row.day_of_week, {
                        start_time: event.target.value,
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">〜</span>
                  <Label htmlFor={endId} className="sr-only">
                    {dayLabel} 終了時刻
                  </Label>
                  <Input
                    id={endId}
                    type="time"
                    value={row.end_time}
                    disabled={!row.is_active}
                    onChange={(event) =>
                      updateRow(row.day_of_week, {
                        end_time: event.target.value,
                      })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={mutation.isPending} size="sm">
            {mutation.isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

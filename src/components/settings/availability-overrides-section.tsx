"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

interface AvailabilityOverride {
  id: string;
  target_date: string;
  override_type: "block" | "custom";
  start_time: string | null;
  end_time: string | null;
}

const WEEKDAY_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateLabel(target_date: string): string {
  const [yearStr, monthStr, dayStr] = target_date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return target_date;
  // Construct in local time so the displayed weekday matches the calendar date.
  const date = new Date(year, month - 1, day);
  const weekday = WEEKDAY_LABEL[date.getDay()];
  return `${month}/${day} (${weekday})`;
}

function formatHourMinute(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

export function AvailabilityOverridesSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["availability-overrides"],
    queryFn: () =>
      api.get<AvailabilityOverride[]>("/scheduling/overrides"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [overrideType, setOverrideType] = useState<"block" | "custom">("block");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("17:00");
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setTargetDate("");
    setOverrideType("block");
    setStartTime("10:00");
    setEndTime("17:00");
    setFormError(null);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: {
        target_date: string;
        override_type: "block" | "custom";
        start_time?: string;
        end_time?: string;
      } = {
        target_date: targetDate,
        override_type: overrideType,
      };
      if (overrideType === "custom") {
        body.start_time = startTime;
        body.end_time = endTime;
      }
      return api.post<AvailabilityOverride>("/scheduling/overrides", body);
    },
    onSuccess: () => {
      toast.success("除外日を追加しました");
      queryClient.invalidateQueries({ queryKey: ["availability-overrides"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "除外日の追加に失敗しました";
      setFormError(message);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/scheduling/overrides/${id}`);
      return id;
    },
    onSuccess: () => {
      toast.success("除外日を削除しました");
      queryClient.invalidateQueries({ queryKey: ["availability-overrides"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "除外日の削除に失敗しました";
      toast.error(message);
    },
  });

  function handleSubmit() {
    setFormError(null);
    if (!targetDate) {
      setFormError("日付を選択してください");
      return;
    }
    if (overrideType === "custom") {
      if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
        setFormError("時刻はHH:MM形式で入力してください");
        return;
      }
      if (startTime >= endTime) {
        setFormError("開始時刻は終了時刻より前にしてください");
        return;
      }
    }
    createMutation.mutate();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          特定日のブロックや、空き時間の上書きを登録できます
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            除外日の取得に失敗しました
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            除外日は登録されていません
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((override) => {
              const startLabel = formatHourMinute(override.start_time);
              const endLabel = formatHourMinute(override.end_time);
              return (
                <li
                  key={override.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatDateLabel(override.target_date)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {override.override_type === "block"
                        ? "終日ブロック"
                        : startLabel && endLabel
                          ? `カスタム ${startLabel} 〜 ${endLabel}`
                          : "カスタム"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(override.id)}
                    disabled={
                      deleteMutation.isPending &&
                      deleteMutation.variables === override.id
                    }
                    className="shrink-0 text-destructive hover:text-destructive"
                    aria-label={`${formatDateLabel(override.target_date)} を削除`}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    削除
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              除外日を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>除外日を追加</DialogTitle>
              <DialogDescription>
                指定した日付を空き時間から除外します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="override-date">日付</Label>
                <Input
                  id="override-date"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="override-type">種別</Label>
                <select
                  id="override-type"
                  value={overrideType}
                  onChange={(event) =>
                    setOverrideType(event.target.value as "block" | "custom")
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="block">終日ブロック</option>
                  <option value="custom">カスタム時間帯</option>
                </select>
              </div>
              {overrideType === "custom" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="override-start">開始時刻</Label>
                    <Input
                      id="override-start"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="override-end">終了時刻</Label>
                    <Input
                      id="override-end"
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}
              {formError ? (
                <p className="text-xs text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "追加中..." : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

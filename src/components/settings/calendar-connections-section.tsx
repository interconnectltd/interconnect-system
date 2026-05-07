"use client";

import { useState } from "react";
import { Calendar, Mail, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";

export function CalendarConnectionsSection() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [icsLoading, setIcsLoading] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [icsError, setIcsError] = useState<string | null>(null);

  async function handleGoogleConnect() {
    setGoogleLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/calendar/connect");
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Google Calendar 連携の開始に失敗しました";
      toast.error(message);
      setGoogleLoading(false);
    }
  }

  async function handleMicrosoftConnect() {
    setMicrosoftLoading(true);
    try {
      const { url } = await api.post<{ url: string }>(
        "/calendar/microsoft/connect",
      );
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Microsoft Outlook 連携の開始に失敗しました";
      toast.error(message);
      setMicrosoftLoading(false);
    }
  }

  async function handleIcsSubscribe() {
    const trimmed = icsUrl.trim();
    if (!trimmed) {
      setIcsError("ICS URLを入力してください");
      return;
    }
    setIcsError(null);
    setIcsLoading(true);
    try {
      await api.post("/calendar/ics/subscribe", { ics_url: trimmed });
      toast.success("ICSカレンダーを登録しました");
      setIcsUrl("");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "ICS URL の登録に失敗しました";
      setIcsError(message);
      toast.error(message);
    } finally {
      setIcsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Calendar className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Google Calendar</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                個別API連携。Google ユーザーをカバー（85〜90%）
              </p>
            </div>
          </div>
          <Button
            onClick={handleGoogleConnect}
            disabled={googleLoading}
            size="sm"
            className="shrink-0"
          >
            {googleLoading ? "接続中..." : "接続"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Mail className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Microsoft Outlook</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                個別API連携。Outlook / Microsoft 365 ユーザー向け
              </p>
            </div>
          </div>
          <Button
            onClick={handleMicrosoftConnect}
            disabled={microsoftLoading}
            size="sm"
            className="shrink-0"
          >
            {microsoftLoading ? "接続中..." : "接続"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Link2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-medium">ICS URL購読</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Apple カレンダー / Yahoo / サイボウズ / Garoon など。15分ごとに同期
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ics-url-input" className="text-xs">
              ICS URL
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="ics-url-input"
                type="url"
                inputMode="url"
                placeholder="https://example.com/calendar.ics"
                value={icsUrl}
                onChange={(event) => {
                  setIcsUrl(event.target.value);
                  if (icsError) setIcsError(null);
                }}
                disabled={icsLoading}
                aria-invalid={icsError !== null}
                aria-describedby={icsError ? "ics-url-error" : undefined}
              />
              <Button
                onClick={handleIcsSubscribe}
                disabled={icsLoading}
                size="sm"
                className="shrink-0"
              >
                {icsLoading ? "登録中..." : "登録"}
              </Button>
            </div>
            {icsError ? (
              <p
                id="ics-url-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {icsError}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

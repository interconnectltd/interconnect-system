"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface FeedTokenResponse {
  token: string;
  url?: string;
}

export function FeedUrlSection() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["calendar-feed-token"],
    queryFn: () => api.get<FeedTokenResponse>("/calendar/feed-token"),
  });

  const feedUrl = data
    ? data.url ?? (origin ? `${origin}/api/v1/calendar/feed/${data.token}` : "")
    : "";

  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success("フィードURLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("クリップボードへのコピーに失敗しました");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          このURLを Google Calendar / Outlook / Apple Calendar に貼ると、INTERCONNECTで確定したミーティングが自動で同期されます
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="feed-url-input" className="text-xs">
            INTERCONNECT カレンダーフィードURL
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="feed-url-input"
              type="text"
              value={
                isLoading
                  ? "読み込み中..."
                  : isError
                    ? "URLの取得に失敗しました"
                    : feedUrl
              }
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              onClick={handleCopy}
              disabled={!feedUrl || isLoading || isError}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  コピー
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

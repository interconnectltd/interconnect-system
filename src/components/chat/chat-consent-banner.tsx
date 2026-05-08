"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CONSENT_STORAGE_KEY = "chat_ai_consent_v1";
const CONSENT_ACCEPTED_VALUE = "accepted";

export default function ChatConsentBanner({
  onAccept,
}: {
  onAccept?: () => void;
}) {
  // Default to hidden until we've checked localStorage on mount, so SSR
  // doesn't flash the banner to users who already accepted.
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored !== CONSENT_ACCEPTED_VALUE) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — show the banner.
      setVisible(true);
    }
  }, []);

  if (!hydrated || !visible) return null;

  function handleAccept() {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ACCEPTED_VALUE);
    } catch {
      // ignore — still respect this session's choice
    }
    setVisible(false);
    onAccept?.();
  }

  function handleLater() {
    setVisible(false);
  }

  return (
    <div className="sticky top-0 z-20 px-3 pt-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-start gap-2 sm:items-center">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-foreground sm:text-sm">
              INTERCONNECTはあなたとお相手のメッセージをAIで分析し、より良いマッチングのために利用します。設定画面からいつでも停止できます。
            </p>
          </div>
          <div className="flex shrink-0 gap-2 sm:ml-auto">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleLater}
            >
              後で
            </Button>
            <Button type="button" size="sm" onClick={handleAccept}>
              同意する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

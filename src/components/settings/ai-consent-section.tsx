"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CONSENT_STORAGE_KEY = "chat_ai_consent_v1";
const CONSENT_ACCEPTED_VALUE = "accepted";

export function AiConsentSection() {
  const [hydrated, setHydrated] = useState(false);
  const [consented, setConsented] = useState(false);

  const readConsent = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      setConsented(stored === CONSENT_ACCEPTED_VALUE);
    } catch {
      // localStorage unavailable — treat as not consented
      setConsented(false);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    readConsent();
  }, [readConsent]);

  function handleRevoke() {
    try {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      readConsent();
      toast.success("AI 分析への同意を撤回しました");
    } catch {
      toast.error("同意の撤回に失敗しました");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            INTERCONNECT
            はチャットメッセージを AI で分析し、より良いマッチングのために利用します。同意状態はこの画面でいつでも変更できます。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">現在の同意状態: </span>
            <span className="font-medium">
              {!hydrated ? "確認中..." : consented ? "同意済み" : "未同意"}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            disabled={!hydrated || !consented}
          >
            同意を撤回する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

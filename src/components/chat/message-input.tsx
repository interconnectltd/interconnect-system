"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api-client";

interface MessageInputProps {
  roomId: string;
  onSent?: () => void;
}

const MAX_ROWS = 5;
const LINE_HEIGHT_PX = 20; // matches text-sm leading

export default function MessageInput({ roomId, onSent }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset draft when switching rooms.
  useEffect(() => {
    setValue("");
  }, [roomId]);

  // Auto-grow textarea up to MAX_ROWS lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_ROWS + 16; // padding allowance
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/chat/rooms/${roomId}/messages`, { content: trimmed });
      setValue("");
      onSent?.();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "メッセージの送信に失敗しました";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="メッセージを入力（Cmd/Ctrl + Enter で送信）"
          disabled={submitting}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void handleSend()}
          disabled={submitting || value.trim().length === 0}
          aria-label="送信"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

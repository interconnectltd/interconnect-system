"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import SchedulingCard from "@/components/chat/scheduling-card";
import MeetingSuggestionCard from "@/components/chat/meeting-suggestion-card";
import MeetingConfirmedCard from "@/components/chat/meeting-confirmed-card";

type ContentType =
  | "text"
  | "image"
  | "file"
  | "scheduling_card"
  | "meeting_suggestion"
  | "meeting_confirmed";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  content_type: ContentType;
  is_read: boolean;
  created_at: string;
}

interface MessagesResponse {
  messages: ChatMessage[];
  next_cursor: string | null;
}

interface ChatMessagesProps {
  roomId: string;
  currentUserId: string;
  onActivity?: () => void;
}

interface SchedulingCardData {
  suggestions: Array<{ date: string; start: string; end: string; score: number }>;
  targetUserId: string;
  roomId: string;
  durationMin: number;
}

interface MeetingSuggestionData {
  intent: "confirmed" | "proposed" | "none";
  datetime: string | null;
  platform: "zoom" | "meet" | null;
  confidence: number;
  triggered_by: string;
}

interface MeetingConfirmedData {
  meeting_id: string;
  scheduled_at: string;
  platform: string | null;
  meeting_url: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function ChatMessages({
  roomId,
  currentUserId,
  onActivity,
}: ChatMessagesProps) {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: () =>
      api.get<MessagesResponse>(`/chat/rooms/${roomId}/messages`),
  });

  // Mark as read on initial load and whenever a new message arrives.
  useEffect(() => {
    if (!data) return;
    void api
      .post(`/chat/rooms/${roomId}/read`)
      .then(() => onActivity?.())
      .catch(() => {
        // Non-fatal: read marker fails are silent.
      });
  }, [data, roomId, onActivity]);

  // Reset realtime buffer when changing rooms.
  useEffect(() => {
    setRealtimeMessages([]);
  }, [roomId]);

  // Subscribe to Supabase Realtime for this room.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as ChatMessage;
          setRealtimeMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Combine fetched (newest-first from API) with realtime, dedupe, and sort oldest-first.
  const messages = useMemo<ChatMessage[]>(() => {
    const initial = data?.messages ?? [];
    const seen = new Set<string>();
    const combined: ChatMessage[] = [];
    for (const m of [...initial, ...realtimeMessages]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      combined.push(m);
    }
    combined.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return combined;
  }, [data, realtimeMessages]);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // When a realtime message arrives from the peer, mark it read.
  useEffect(() => {
    if (realtimeMessages.length === 0) return;
    const last = realtimeMessages[realtimeMessages.length - 1];
    if (last && last.sender_id !== currentUserId) {
      void api.post(`/chat/rooms/${roomId}/read`).catch(() => {
        // ignore
      });
      onActivity?.();
    }
  }, [realtimeMessages, currentUserId, roomId, onActivity]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 max-w-[70%] animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          メッセージを送信して会話を始めましょう
        </div>
      ) : (
        messages.map((message) => {
          const isSelf = message.sender_id === currentUserId;

          if (message.content_type === "scheduling_card") {
            const parsed = safeParse<SchedulingCardData>(message.content);
            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  isSelf ? "justify-end" : "justify-start",
                )}
              >
                <div className="max-w-[80%]">
                  {parsed ? (
                    <SchedulingCard data={parsed} />
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      日程候補の表示に失敗しました
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          }

          if (message.content_type === "meeting_suggestion") {
            const parsed = safeParse<MeetingSuggestionData>(message.content);
            return (
              <div key={message.id} className="flex w-full justify-center">
                <div className="max-w-[90%]">
                  {parsed ? (
                    <MeetingSuggestionCard data={parsed} roomId={roomId} />
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      ミーティング提案の表示に失敗しました
                    </div>
                  )}
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          }

          if (message.content_type === "meeting_confirmed") {
            const parsed = safeParse<MeetingConfirmedData>(message.content);
            return (
              <div key={message.id} className="flex w-full justify-center">
                <div className="max-w-[90%]">
                  {parsed ? (
                    <MeetingConfirmedCard data={parsed} />
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      ミーティング確定の表示に失敗しました
                    </div>
                  )}
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          }

          // text / image / file → simple bubble
          return (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                isSelf ? "justify-end" : "justify-start",
              )}
            >
              <div className="max-w-[75%]">
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm",
                    isSelf
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                <p
                  className={cn(
                    "mt-1 text-[10px] text-muted-foreground",
                    isSelf ? "text-right" : "text-left",
                  )}
                >
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

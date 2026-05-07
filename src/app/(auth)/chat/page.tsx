"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import ChatRoomList from "@/components/chat/chat-room-list";
import ChatMessages from "@/components/chat/chat-messages";
import MessageInput from "@/components/chat/message-input";

interface ChatRoomSummary {
  id: string;
  peer: { id: string; name: string | null; avatar_url: string | null };
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface ChatRoomsResponse {
  rooms: ChatRoomSummary[];
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedRoomId = searchParams.get("room");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Resolve the current user's id once on mount; ChatMessages uses it to align bubbles.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentUserId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => api.get<ChatRoomsResponse>("/chat/rooms"),
    refetchOnWindowFocus: true,
  });

  const rooms = data?.rooms ?? [];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  function handleSelect(roomId: string) {
    router.replace(`/chat?room=${roomId}`);
  }

  function handleBack() {
    router.replace("/chat");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Room list */}
      <aside
        className={`${
          selectedRoomId ? "hidden md:flex" : "flex"
        } w-full flex-col border-r md:w-80`}
      >
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">チャット</h1>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">まだチャットがありません</p>
            <p className="mt-1 text-xs text-muted-foreground">
              コネクション一覧から「チャット開始」ボタンでスタート
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/connections">コネクション一覧へ</Link>
            </Button>
          </div>
        ) : (
          <ChatRoomList
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelect={handleSelect}
          />
        )}
      </aside>

      {/* Messages panel */}
      <section
        className={`${
          selectedRoomId ? "flex" : "hidden md:flex"
        } min-w-0 flex-1 flex-col`}
      >
        {selectedRoom && currentUserId ? (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="md:hidden"
                aria-label="戻る"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {selectedRoom.peer.name ?? "メンバー"}
                </p>
              </div>
            </div>
            <ChatMessages
              roomId={selectedRoom.id}
              currentUserId={currentUserId}
              onActivity={() => {
                void refetch();
              }}
            />
            <MessageInput
              roomId={selectedRoom.id}
              onSent={() => {
                void refetch();
              }}
            />
          </>
        ) : (
          <div className="hidden flex-1 items-center justify-center text-sm text-muted-foreground md:flex">
            ルームを選択してください
          </div>
        )}
      </section>
    </div>
  );
}

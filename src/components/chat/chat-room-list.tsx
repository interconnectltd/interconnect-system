"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatRoomSummary {
  id: string;
  peer: { id: string; name: string | null; avatar_url: string | null };
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface ChatRoomListProps {
  rooms: ChatRoomSummary[];
  selectedRoomId: string | null;
  onSelect: (roomId: string) => void;
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default function ChatRoomList({
  rooms,
  selectedRoomId,
  onSelect,
}: ChatRoomListProps) {
  return (
    <ul className="flex-1 overflow-y-auto">
      {rooms.map((room) => {
        const isSelected = room.id === selectedRoomId;
        return (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent",
                isSelected && "bg-accent",
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                {room.peer.avatar_url ? (
                  <AvatarImage
                    src={room.peer.avatar_url}
                    alt={room.peer.name ?? ""}
                  />
                ) : null}
                <AvatarFallback>{initialsOf(room.peer.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {room.peer.name ?? "メンバー"}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTimeAgo(room.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {room.last_message_preview ?? "メッセージはまだありません"}
                  </p>
                  {room.unread_count > 0 && (
                    <Badge
                      variant="default"
                      className="shrink-0 px-1.5 py-0 text-[10px] leading-4"
                    >
                      {room.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

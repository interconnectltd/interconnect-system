/**
 * Connections page (Server Component).
 *
 * Lists the current user's accepted connections as a card grid. Each card
 * shows the peer's avatar, name, and position, plus an action that either:
 *   - opens an existing chat room  → Link to /chat?room={roomId}
 *   - starts a new chat            → form posting to startChatAction
 *
 * Data shape: we do two queries (legacy `connections` schema is bidirectional
 * — current user can be either user_id or connected_user_id), then a single
 * batch lookup in chat_rooms keyed by connection_id, joined client-side.
 *
 * Architecture ref: CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §13.1 row "接続ページ".
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { startChatAction } from "./_actions";

export const dynamic = "force-dynamic";

interface PeerProfile {
  id: string;
  name: string | null;
  full_name: string | null;
  position: string | null;
  company: string | null;
  avatar_url: string | null;
}

interface ConnectionCardData {
  connectionId: string;
  peer: PeerProfile;
  roomId: string | null;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "??";
  const trimmed = name.trim();
  if (!trimmed) return "??";
  // Take first character of each space-separated token, max 2 chars.
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all accepted connections where the current user is a party.
  // The legacy schema does not enforce a canonical ordering, so we OR on
  // both columns and resolve "the other party" client-side.
  const acceptedStatuses = ["accepted", "reaccepted"];
  const { data: connections, error } = await supabase
    .from("connections")
    .select("id, user_id, connected_user_id, status, updated_at")
    .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
    .in("status", acceptedStatuses)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load connections: ${error.message}`);
  }

  const rows = connections ?? [];

  // Resolve peer ids and load profiles + existing rooms in parallel.
  const peerIds = rows.map((r) =>
    r.user_id === user.id ? r.connected_user_id : r.user_id,
  );
  const connectionIds = rows.map((r) => r.id);

  const [profilesRes, roomsRes] = await Promise.all([
    peerIds.length
      ? supabase
          .from("user_profiles")
          .select("id, name, full_name, position, company, avatar_url")
          .in("id", peerIds)
      : Promise.resolve({ data: [], error: null }),
    connectionIds.length
      ? supabase
          .from("chat_rooms")
          .select("id, connection_id")
          .in("connection_id", connectionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profileById = new Map<string, PeerProfile>();
  for (const p of profilesRes.data ?? []) {
    profileById.set(p.id, p as PeerProfile);
  }

  const roomByConnection = new Map<string, string>();
  for (const r of roomsRes.data ?? []) {
    if (r.connection_id && r.id) {
      roomByConnection.set(r.connection_id, r.id);
    }
  }

  const cards: ConnectionCardData[] = rows
    .map((r) => {
      const peerId = r.user_id === user.id ? r.connected_user_id : r.user_id;
      const peer = profileById.get(peerId);
      if (!peer) return null;
      return {
        connectionId: r.id,
        peer,
        roomId: roomByConnection.get(r.id) ?? null,
      };
    })
    .filter((c): c is ConnectionCardData => c !== null);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">コネクション</h1>
      </header>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10" aria-hidden />
            <p className="text-sm">まだコネクションがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ connectionId, peer, roomId }) => {
            const displayName = peer.name ?? peer.full_name ?? "メンバー";
            const subtitle = [peer.position, peer.company]
              .filter((s): s is string => Boolean(s && s.trim()))
              .join(" / ");

            return (
              <Card key={connectionId} className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <Avatar className="h-12 w-12">
                    {peer.avatar_url ? (
                      <AvatarImage src={peer.avatar_url} alt={displayName} />
                    ) : null}
                    <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {displayName}
                    </CardTitle>
                    {subtitle ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  {roomId ? (
                    <Button asChild className="w-full" variant="default">
                      <Link href={`/chat?room=${roomId}`}>
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        チャットを開く
                      </Link>
                    </Button>
                  ) : (
                    <form action={startChatAction}>
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connectionId}
                      />
                      <Button type="submit" className="w-full">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        チャット開始
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Meetings page (Server Component).
 *
 * Two tabs:
 *   - 予定一覧:    list of upcoming meetings the current user participates in
 *   - カレンダービュー: a thin pointer to the existing /calendar page (we don't
 *                       reimplement calendar UI here — single source of truth)
 *
 * The list query joins meeting_participants_v2 → meetings, filtering on:
 *   - participant.user_id = me
 *   - meeting.status != 'cancelled'
 *   - meeting.scheduled_at >= now()
 * ordered by scheduled_at ASC. Peer names are resolved with a second query
 * over meeting_participants_v2 + user_profiles for display fallback.
 *
 * Architecture ref: CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §13.1 row "会議ページ".
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MeetingRow,
  type MeetingRowData,
} from "@/components/meetings/meeting-row";

export const dynamic = "force-dynamic";

interface MeetingShape {
  id: string;
  title: string | null;
  scheduled_at: string;
  duration_min: number | null;
  status: string | null;
  platform: string | null;
  meeting_url: string | null;
}

export default async function MeetingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  // Step 1: get the participant rows for this user, joining the meetings
  // table. The supabase-js relational select `meetings(*)` returns the
  // related row inline, but we narrow the field list for clarity.
  const { data: participantRows, error } = await supabase
    .from("meeting_participants_v2")
    .select(
      `
        meeting_id,
        meeting:meetings!inner (
          id,
          title,
          scheduled_at,
          duration_min,
          status,
          platform,
          meeting_url
        )
      `,
    )
    .eq("user_id", user.id)
    .neq("meeting.status", "cancelled")
    .gte("meeting.scheduled_at", nowIso)
    .order("scheduled_at", {
      ascending: true,
      foreignTable: "meeting",
    });

  if (error) {
    throw new Error(`Failed to load meetings: ${error.message}`);
  }

  // The relational select can return either an object or array depending on
  // FK cardinality; normalise to object.
  const meetings: MeetingShape[] = (participantRows ?? [])
    .map((row) => {
      const m = row.meeting as MeetingShape | MeetingShape[] | null;
      if (!m) return null;
      return Array.isArray(m) ? (m[0] ?? null) : m;
    })
    .filter((m): m is MeetingShape => m !== null);

  // Step 2: peer names. For each meeting, the "peer" is the participant
  // that isn't the current user. Batch-load and group.
  const meetingIds = meetings.map((m) => m.id);
  const peerByMeeting = new Map<string, string>();

  if (meetingIds.length > 0) {
    const { data: allParticipants } = await supabase
      .from("meeting_participants_v2")
      .select(
        `
          meeting_id,
          user_id,
          user:user_profiles!meeting_participants_v2_user_id_fkey (
            id,
            name,
            full_name
          )
        `,
      )
      .in("meeting_id", meetingIds)
      .neq("user_id", user.id);

    for (const p of allParticipants ?? []) {
      if (peerByMeeting.has(p.meeting_id)) continue;
      const u = (p as { user: { name: string | null; full_name: string | null } | { name: string | null; full_name: string | null }[] | null }).user;
      const profile = Array.isArray(u) ? u[0] : u;
      const name = profile?.name ?? profile?.full_name ?? null;
      if (name) peerByMeeting.set(p.meeting_id, name);
    }
  }

  const rows: MeetingRowData[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    scheduledAt: m.scheduled_at,
    durationMin: m.duration_min,
    platform: m.platform,
    meetingUrl: m.meeting_url,
    peerName: peerByMeeting.get(m.id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center gap-3">
        <Video className="h-6 w-6 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">会議</h1>
      </header>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">予定一覧</TabsTrigger>
          <TabsTrigger value="calendar">カレンダービュー</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <Calendar className="h-10 w-10" aria-hidden />
                <p className="text-sm">予定されている会議はありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((m) => (
                <MeetingRow key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                週単位のカレンダー表示は専用ページで確認できます
              </p>
              <Button asChild>
                <Link href="/calendar">
                  <Calendar className="h-4 w-4" aria-hidden />
                  カレンダーで見る
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

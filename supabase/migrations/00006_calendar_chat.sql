-- ============================================================
-- Migration 00006: Calendar & Chat
-- カレンダー連携 (Google Calendar OAuth) + 1:1チャット機能
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. notification_type に 'chat_message' を追加
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ALTER COLUMN type TYPE TEXT;
DROP TYPE IF EXISTS public.notification_type;
CREATE TYPE public.notification_type AS ENUM (
  'connection_request',
  'meeting_request',
  'meeting_confirmed',
  'meeting_summary',
  'introduction_request',
  'introduction_completed',
  'new_match_weekly',
  'new_match_high',
  'mutual_match',
  'maturity_up',
  'contact_exchange',
  'intervention_alert',
  'followup_reminder',
  'system',
  'chat_message'
);
ALTER TABLE public.notifications ALTER COLUMN type TYPE public.notification_type USING type::text::public.notification_type;

-- ────────────────────────────────────────────────────────────
-- 2. CALENDAR TABLES
-- ────────────────────────────────────────────────────────────

-- T40: calendar_connections — OAuth token storage
CREATE TABLE public.calendar_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN ('google')),
  provider_email    TEXT NOT NULL,
  access_token_enc  TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ,
  sync_cursor       TEXT,
  last_synced_at    TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_email)
);

-- T41: calendar_events — Synced events from Google Calendar
CREATE TABLE public.calendar_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  google_event_id   TEXT NOT NULL,
  title             TEXT,
  start_at          TIMESTAMPTZ,
  end_at            TIMESTAMPTZ,
  video_url         TEXT,
  video_platform    public.meeting_platform,
  attendee_emails   JSONB DEFAULT '[]',
  is_interconnect   BOOLEAN NOT NULL DEFAULT false,
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  -- FK to public.meetings(id) is installed in 00009 (meetings is created there).
  linked_meeting_id UUID,
  etag              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, google_event_id)
);

CREATE INDEX idx_calendar_events_user_start ON public.calendar_events(user_id, start_at DESC);
CREATE INDEX idx_calendar_events_interconnect ON public.calendar_events(is_interconnect) WHERE is_interconnect = true;

-- meetings テーブルへの calendar_event_id 追加は 00009 の CREATE TABLE 内で行う
-- (00009 がこのテーブルを初めて作成するため、ここで ALTER できない)

-- ────────────────────────────────────────────────────────────
-- 3. CHAT TABLES
-- ────────────────────────────────────────────────────────────

-- T42: chat_rooms — 1:1 chat rooms linked to connections
CREATE TABLE public.chat_rooms (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id        UUID NOT NULL UNIQUE REFERENCES public.connections(id) ON DELETE CASCADE,
  user_a_id            UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_b_id            UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- T43: chat_messages — Messages
CREATE TABLE public.chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file')),
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_created ON public.chat_messages(room_id, created_at DESC);

-- T44: chat_analysis — Agent A chat analysis results
CREATE TABLE public.chat_analysis (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  analyzed_up_to_id  UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  extracted_topics   JSONB NOT NULL DEFAULT '[]',
  extracted_needs    JSONB NOT NULL DEFAULT '[]',
  extracted_offers   JSONB NOT NULL DEFAULT '[]',
  engagement_signals JSONB NOT NULL DEFAULT '{}',
  analyzed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. TRIGGERS (updated_at)
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER trg_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_analysis ENABLE ROW LEVEL SECURITY;

-- calendar_connections: user can CRUD own rows, service_role bypasses RLS
CREATE POLICY "own_calendar_connections" ON public.calendar_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_calendar_connections" ON public.calendar_connections
  FOR ALL USING (true);

-- calendar_events: user can SELECT own rows, service_role full access
CREATE POLICY "own_calendar_events_select" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_calendar_events" ON public.calendar_events
  FOR ALL USING (true);

-- chat_rooms: user can SELECT where they are a participant
CREATE POLICY "own_chat_rooms" ON public.chat_rooms
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- chat_messages: user can SELECT/INSERT where room belongs to them
CREATE POLICY "own_chat_messages_select" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id
        AND (cr.user_a_id = auth.uid() OR cr.user_b_id = auth.uid())
    )
  );

CREATE POLICY "own_chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id
        AND (cr.user_a_id = auth.uid() OR cr.user_b_id = auth.uid())
    )
  );

CREATE POLICY "service_chat_messages" ON public.chat_messages
  FOR ALL USING (true);

-- chat_analysis: service_role only (no user policy)
CREATE POLICY "service_chat_analysis" ON public.chat_analysis
  FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────
-- 6. REALTIME — Enable Supabase Realtime on chat_messages
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ────────────────────────────────────────────────────────────
-- 完了
-- T40: calendar_connections — OAuth token storage (Google Calendar)
-- T41: calendar_events — Synced calendar events
-- T42: chat_rooms — 1:1 chat rooms (connection-linked)
-- T43: chat_messages — Chat messages (realtime enabled)
-- T44: chat_analysis — Agent A chat analysis results
-- meetings.calendar_event_id — Reverse link from meetings to calendar events
-- notification_type — 'chat_message' 追加
-- ────────────────────────────────────────────────────────────

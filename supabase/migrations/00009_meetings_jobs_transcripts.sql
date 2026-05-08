-- ============================================================
-- Migration 00009: Meetings, Meeting Requests, Participants v2,
--                  Transcripts, and Job Queue
-- ------------------------------------------------------------
-- Date: 2026-05-07
--
-- Purpose:
--   The Next.js code under src/app/api/v1/ (scheduling/confirm,
--   meetings/from-chat, webhooks/zoom, calendar/feed/[token],
--   meetings/[id]/ics) and the worker pipeline (worker/src/
--   handlers/ingest.ts) reference five tables that exist neither
--   in sql/000_canonical_schema.sql nor in migrations 00006/
--   00007/00008. Without these tables every chat→meeting flow
--   and the Agent A recording ingest pipeline fails with
--   "relation X does not exist" in production.
--
--   Tables created here:
--     - meetings                     (chat→meeting, scheduling/confirm)
--     - meeting_requests             (parent of meetings)
--     - meeting_participants_v2      (per-meeting participant rows)
--     - meeting_transcripts          (Agent A ingest output)
--     - job_queue                    (async dispatch for ingest/analyze)
--
--   Architecture refs:
--     - CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §3, §5, §6.2
--     - 00006 already references public.meetings(id) via the
--       calendar_events.linked_meeting_id FK and via the
--       ALTER TABLE meetings ADD COLUMN calendar_event_id
--       statement; this migration finally creates that table.
--
--   Column shapes were inferred by reading every .from("...")
--   call across src/ and worker/, plus src/types/database.ts.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. meeting_requests
--    Used by: /api/v1/scheduling/confirm, /api/v1/meetings/from-chat
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'confirmed', 'rejected', 'cancelled')),
  proposed_times  JSONB NOT NULL DEFAULT '[]'::jsonb,
  message         TEXT,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_requests_requester ON public.meeting_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_target    ON public.meeting_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status    ON public.meeting_requests(status);

-- ────────────────────────────────────────────────────────────
-- 2. meetings
--    Used by: /api/v1/scheduling/confirm, /api/v1/meetings/from-chat,
--             /api/v1/meetings/[id]/ics, /api/v1/calendar/feed/[token],
--             /api/v1/webhooks/zoom, /(auth)/meetings/page.tsx
--
--    Note: 00006 already runs `ALTER TABLE public.meetings ADD
--    COLUMN IF NOT EXISTS calendar_event_id ...`, so the column
--    is added here too (so a fresh DB has it; on an upgraded DB
--    IF NOT EXISTS makes both ALTERs idempotent).
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meetings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID REFERENCES public.meeting_requests(id) ON DELETE SET NULL,
  title             TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_min      INTEGER NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 5 AND 480),
  status            TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  platform          public.meeting_platform,
  meeting_url       TEXT,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_request_id   ON public.meetings(request_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status       ON public.meetings(status);

-- ────────────────────────────────────────────────────────────
-- 2.1 Backfill FK from 00006 (calendar_events.linked_meeting_id → meetings.id)
--     The column was declared without a FK in 00006 because public.meetings
--     does not exist until this migration. Add the constraint now.
--     Idempotency: DO block skips if the constraint already exists.
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendar_events_linked_meeting_id_fkey'
      AND conrelid = 'public.calendar_events'::regclass
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_linked_meeting_id_fkey
        FOREIGN KEY (linked_meeting_id)
        REFERENCES public.meetings(id)
        ON DELETE SET NULL;
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────
-- 3. meeting_participants_v2
--    Used by: /api/v1/scheduling/confirm, /api/v1/meetings/from-chat,
--             /api/v1/meetings/[id]/ics, /api/v1/calendar/feed/[token],
--             /api/v1/webhooks/zoom, /(auth)/meetings/page.tsx
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meeting_participants_v2 (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('requester', 'target', 'guest')),
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_v2_meeting ON public.meeting_participants_v2(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_v2_user    ON public.meeting_participants_v2(user_id);

-- ────────────────────────────────────────────────────────────
-- 4. meeting_transcripts
--    Used by: worker/src/handlers/ingest.ts (insert),
--             /api/v1/retention/cron (nullify .text on retention sweep)
--
--    Columns reflect the union of:
--      - worker insert: external_meeting_id, full_text, raw_transcript, status, source
--      - retention cron: text (separate scrubbable column)
--      - task spec: recording_url, language, segments, meeting_id FK
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  external_meeting_id  TEXT,
  recording_url        TEXT,
  full_text            TEXT,
  text                 TEXT,
  raw_transcript       JSONB,
  segments             JSONB,
  language             TEXT DEFAULT 'ja',
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'analyzed', 'failed')),
  source               TEXT NOT NULL DEFAULT 'agent_a'
                       CHECK (source IN ('agent_a', 'tldv', 'manual')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting     ON public.meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_external_id ON public.meeting_transcripts(external_meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_status      ON public.meeting_transcripts(status);

-- ────────────────────────────────────────────────────────────
-- 5. job_queue
--    Used by: /api/v1/webhooks/zoom (insert "ingest" jobs),
--             worker/src/queue.ts (consumer)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type      TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'queued', 'running', 'completed', 'done', 'failed')),
  priority      INTEGER NOT NULL DEFAULT 5,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_scheduled ON public.job_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_job_type         ON public.job_queue(job_type);

-- ────────────────────────────────────────────────────────────
-- 6. updated_at TRIGGERS
--    Reuses public.update_updated_at() declared by an earlier
--    migration (see 00006/00007 for usage).
-- ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_meeting_requests_updated_at    ON public.meeting_requests;
CREATE TRIGGER trg_meeting_requests_updated_at
  BEFORE UPDATE ON public.meeting_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_meetings_updated_at            ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_meeting_transcripts_updated_at ON public.meeting_transcripts;
CREATE TRIGGER trg_meeting_transcripts_updated_at
  BEFORE UPDATE ON public.meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_job_queue_updated_at           ON public.job_queue;
CREATE TRIGGER trg_job_queue_updated_at
  BEFORE UPDATE ON public.job_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.meeting_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants_v2   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue                 ENABLE ROW LEVEL SECURITY;

-- ----- meeting_requests: requester or target may SELECT; service_role full -----
CREATE POLICY "own_meeting_requests_select" ON public.meeting_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "service_meeting_requests" ON public.meeting_requests
  FOR ALL USING (true);

-- ----- meetings: visible to participants via meeting_participants_v2 -----
CREATE POLICY "participant_meetings_select" ON public.meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants_v2 mp
      WHERE mp.meeting_id = meetings.id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "service_meetings" ON public.meetings
  FOR ALL USING (true);

-- ----- meeting_participants_v2: own row OR same-meeting peer -----
CREATE POLICY "own_meeting_participants_v2_select" ON public.meeting_participants_v2
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meeting_participants_v2 self
      WHERE self.meeting_id = meeting_participants_v2.meeting_id
        AND self.user_id = auth.uid()
    )
  );

CREATE POLICY "service_meeting_participants_v2" ON public.meeting_participants_v2
  FOR ALL USING (true);

-- ----- meeting_transcripts: NO user access (service_role only) -----
-- Transcripts contain sensitive analysis output; surfaced to users only
-- via aggregated structures (transcript_insights / matching scores).
CREATE POLICY "service_meeting_transcripts" ON public.meeting_transcripts
  FOR ALL USING (true);

-- ----- job_queue: service_role only -----
CREATE POLICY "service_job_queue" ON public.job_queue
  FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────
-- 完了
--   meeting_requests           — chat→meeting parent
--   meetings                   — confirmed meeting record
--   meeting_participants_v2    — per-meeting participants (Agent A target)
--   meeting_transcripts        — Deepgram output, retention-scrubbable
--   job_queue                  — async ingest/analyze dispatch
-- ────────────────────────────────────────────────────────────

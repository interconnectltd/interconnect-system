-- ============================================================
-- Migration 00007: Scheduling & Availability
-- Phase 1 of Calendar/Chat/Agent A architecture
-- - Rename google_event_id -> external_event_id
-- - Expand calendar_connections.provider CHECK
-- - Add ICS URL columns to calendar_connections
-- - Create availability_rules and availability_overrides tables
-- - Add timezone to user_profiles
-- - Expand chat_messages.content_type CHECK
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Rename google_event_id -> external_event_id
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.calendar_events
  RENAME COLUMN google_event_id TO external_event_id;

-- Update the UNIQUE constraint (drop old, add new)
ALTER TABLE public.calendar_events
  DROP CONSTRAINT calendar_events_connection_id_google_event_id_key;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_connection_id_external_event_id_key
    UNIQUE (connection_id, external_event_id);

-- ────────────────────────────────────────────────────────────
-- 2. Expand calendar_connections.provider CHECK
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.calendar_connections
  DROP CONSTRAINT calendar_connections_provider_check,
  ADD CONSTRAINT calendar_connections_provider_check
    CHECK (provider IN ('google', 'microsoft', 'ics_feed'));

-- ────────────────────────────────────────────────────────────
-- 3. Add ICS URL columns to calendar_connections
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS ics_url TEXT,
  ADD COLUMN IF NOT EXISTS ics_etag TEXT;

-- ────────────────────────────────────────────────────────────
-- 4. Create availability_rules table
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.availability_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_rules_user ON public.availability_rules(user_id);

-- ────────────────────────────────────────────────────────────
-- 5. Create availability_overrides table
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.availability_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_date    DATE NOT NULL,
  override_type  TEXT NOT NULL CHECK (override_type IN ('block', 'custom')),
  start_time     TIME,
  end_time       TIME,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_date, start_time)
);

CREATE INDEX idx_availability_overrides_user_date ON public.availability_overrides(user_id, target_date);

-- ────────────────────────────────────────────────────────────
-- 6. Add timezone to user_profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo';

-- ────────────────────────────────────────────────────────────
-- 7. Expand chat_messages.content_type CHECK
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.chat_messages
  DROP CONSTRAINT chat_messages_content_type_check,
  ADD CONSTRAINT chat_messages_content_type_check
    CHECK (content_type IN ('text', 'image', 'file',
                            'scheduling_card', 'meeting_suggestion', 'meeting_confirmed'));

-- ────────────────────────────────────────────────────────────
-- 8. TRIGGERS (updated_at)
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER trg_availability_rules_updated_at
  BEFORE UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

-- availability_rules: user can CRUD own rows, service_role bypasses RLS
CREATE POLICY "own_availability_rules" ON public.availability_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_availability_rules" ON public.availability_rules
  FOR ALL USING (true);

-- availability_overrides: user can CRUD own rows, service_role bypasses RLS
CREATE POLICY "own_availability_overrides" ON public.availability_overrides
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_availability_overrides" ON public.availability_overrides
  FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────
-- 完了
-- 1. calendar_events.google_event_id -> external_event_id
-- 2. calendar_connections.provider CHECK expanded (google, microsoft, ics_feed)
-- 3. calendar_connections.ics_url, ics_etag columns added
-- 4. availability_rules — Weekly availability template
-- 5. availability_overrides — Date-specific exceptions
-- 6. user_profiles.timezone — User timezone (default Asia/Tokyo)
-- 7. chat_messages.content_type CHECK expanded
-- 8. updated_at trigger for availability_rules
-- 9. RLS for availability_rules and availability_overrides
-- ────────────────────────────────────────────────────────────

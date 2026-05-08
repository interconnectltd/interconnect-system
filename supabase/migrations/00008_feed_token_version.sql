-- 00008_feed_token_version.sql
--
-- Per-user calendar feed token version.
--
-- Security (H2): Calendar ICS feed tokens are public secrets embedded in URLs
-- that may leak via TLS proxy logs, browser history, or calendar app caches.
-- Previously, rotating CALENDAR_FEED_SECRET invalidated ALL feeds globally
-- with no per-user revocation possible.
--
-- This column is signed into each token. Bumping a user's version invalidates
-- only that user's outstanding tokens; other users are unaffected.
--
-- RLS already covers user_profiles.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS feed_token_version INT NOT NULL DEFAULT 1;

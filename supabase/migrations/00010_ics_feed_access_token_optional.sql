-- ============================================================================
-- 00010_ics_feed_access_token_optional.sql
--
-- ICS フィード接続では OAuth bearer token を持たず、URL 自体が credential である。
-- そのため `calendar_connections.access_token_enc` の NOT NULL 制約を緩める。
-- 暗号化された ICS URL は専用カラム `ics_url` に AES-256-GCM で 1 度だけ
-- encryptToken() された状態で格納される (privacy-policy-update-draft §2.3 準拠)。
-- ============================================================================

ALTER TABLE public.calendar_connections
  ALTER COLUMN access_token_enc DROP NOT NULL;

-- ICS フィード行では access_token_enc は意味を持たない。
-- 既存 OAuth 接続 (google / microsoft) では引き続き値が入っているため、
-- アプリケーション層で provider 別に必須性をチェックする運用とする。
COMMENT ON COLUMN public.calendar_connections.access_token_enc IS
  'OAuth access token (AES-256-GCM encrypted). Required for google / microsoft providers; NULL/empty allowed for ics_feed (which uses encrypted ics_url instead).';

COMMENT ON COLUMN public.calendar_connections.ics_url IS
  'ICS feed URL (AES-256-GCM encrypted via encryptToken). Set only for provider = ics_feed. Decrypt with decryptToken before fetching.';

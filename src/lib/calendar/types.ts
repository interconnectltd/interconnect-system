// src/lib/calendar/types.ts — Core calendar provider interfaces

export type ProviderType = "google" | "microsoft" | "ics_feed";
export type AuthMethod = "oauth2" | "none";

/** Provider-normalized event (abstracts away Google/Microsoft/ICS differences) */
export interface NormalizedEvent {
  externalId: string;
  title: string | null;
  startAt: string; // ISO 8601 UTC
  endAt: string;
  attendeeEmails: string[];
  videoUrl: string | null;
  videoPlatform: "zoom" | "google_meet" | "teams" | null;
  etag: string | null;
  status: "confirmed" | "cancelled" | "tentative";
}

export interface SyncResult {
  events: NormalizedEvent[];
  nextSyncCursor: string | null;
}

/** Represents a row from calendar_connections table */
export interface ConnectionRecord {
  id: string;
  user_id: string;
  provider: ProviderType;
  provider_email: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  sync_cursor: string | null;
  is_active: boolean;
  ics_url?: string | null;
  ics_etag?: string | null;
}

/** All providers implement this interface */
export interface CalendarProvider {
  readonly type: ProviderType;
  readonly authMethod: AuthMethod;

  /** Generate OAuth authorization URL */
  getAuthUrl?(state: string): string;

  /** Handle OAuth callback */
  handleCallback?(code: string): Promise<{
    providerEmail: string;
    accessTokenEnc: string;
    refreshTokenEnc: string | null;
    tokenExpiresAt: string | null;
  }>;

  /** Refresh an expired access token */
  refreshToken?(connection: ConnectionRecord): Promise<{
    accessToken: string;
    expiresIn: number;
  }>;

  /** Sync events (incremental via cursor, or full if cursor is null) */
  syncEvents(
    connection: ConnectionRecord,
    syncCursor: string | null,
  ): Promise<SyncResult>;
}

/** Typed error for calendar provider operations */
export class CalendarProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderType,
    public readonly code:
      | "AUTH_FAILED"
      | "TOKEN_EXPIRED"
      | "SYNC_TOKEN_INVALID"
      | "API_ERROR"
      | "UNKNOWN",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CalendarProviderError";
  }
}

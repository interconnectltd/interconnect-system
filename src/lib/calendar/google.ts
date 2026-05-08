// src/lib/calendar/google.ts — Google Calendar provider implementation

import { encryptToken, decryptToken } from "./crypto";
import type {
  CalendarProvider,
  ConnectionRecord,
  NormalizedEvent,
  SyncResult,
} from "./types";
import { CalendarProviderError } from "./types";

// Re-export crypto functions so existing consumers don't break
export { encryptToken, decryptToken } from "./crypto";

/** Google OAuth refresh token -> access token */
export async function refreshGoogleToken(connection: {
  refresh_token_enc: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const refreshToken = decryptToken(connection.refresh_token_enc);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Google token refresh failed:", body);
    throw new Error("Googleトークンの更新に失敗しました");
  }

  const data = await res.json();
  return { access_token: data.access_token, expires_in: data.expires_in };
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string; responseStatus?: string }[];
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[];
  };
  location?: string;
  description?: string;
  etag?: string;
  status?: string;
}

interface CalendarListResponse {
  items?: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

/** Fetch events from Google Calendar API */
export async function fetchCalendarEvents(
  accessToken: string,
  syncToken?: string | null,
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken: string | null }> {
  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      // Initial sync: past 30 days to future 90 days
      const now = new Date();
      const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      params.set("timeMin", timeMin.toISOString());
      params.set("timeMax", timeMax.toISOString());
    }

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      if (res.status === 410) {
        // Sync token invalidated — caller should full-sync
        return { events: [], nextSyncToken: null };
      }
      const body = await res.text();
      console.error("Google Calendar API error:", res.status, body);
      throw new Error("Googleカレンダーイベントの取得に失敗しました");
    }

    const data: CalendarListResponse = await res.json();
    if (data.items) {
      allEvents.push(...data.items);
    }
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) {
      nextSyncToken = data.nextSyncToken;
    }
  } while (pageToken);

  return { events: allEvents, nextSyncToken };
}

const ZOOM_URL_RE = /https?:\/\/[\w.-]*zoom\.us\/[jw]\/[\w?=&-]+/i;

/** Extract video meeting URL and platform from a Google Calendar event */
export function extractVideoUrl(
  event: GoogleCalendarEvent,
): { url: string; platform: string } | null {
  // 1. Google Meet — conferenceData
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === "video",
    );
    if (videoEntry?.uri) {
      return { url: videoEntry.uri, platform: "google_meet" };
    }
  }

  // 2. Zoom — location or description
  for (const field of [event.location, event.description]) {
    if (field) {
      const match = field.match(ZOOM_URL_RE);
      if (match) {
        return { url: match[0], platform: "zoom" };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalize a Google event into the provider-agnostic NormalizedEvent format
// ---------------------------------------------------------------------------

function normalizeGoogleEvent(event: GoogleCalendarEvent): NormalizedEvent | null {
  const startAt = event.start?.dateTime ?? event.start?.date;
  const endAt = event.end?.dateTime ?? event.end?.date;

  if (!startAt || !endAt) return null;

  const videoInfo = extractVideoUrl(event);

  let status: NormalizedEvent["status"] = "confirmed";
  if (event.status === "cancelled") status = "cancelled";
  else if (event.status === "tentative") status = "tentative";

  return {
    externalId: event.id,
    title: event.summary ?? null,
    startAt,
    endAt,
    attendeeEmails: event.attendees?.map((a) => a.email.toLowerCase()) ?? [],
    videoUrl: videoInfo?.url ?? null,
    videoPlatform: videoInfo?.platform as NormalizedEvent["videoPlatform"] ?? null,
    etag: event.etag ?? null,
    status,
  };
}

// ---------------------------------------------------------------------------
// CalendarProvider implementation
// ---------------------------------------------------------------------------

export const GoogleCalendarProvider: CalendarProvider = {
  type: "google",
  authMethod: "oauth2",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/callback`,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async handleCallback(code: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new CalendarProviderError(
        `Google OAuth token exchange failed: ${body}`,
        "google",
        "AUTH_FAILED",
      );
    }

    const data = await res.json();

    // Fetch user email from the access token
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${data.access_token}` } },
    );
    const profile = await profileRes.json();

    return {
      providerEmail: profile.email as string,
      accessTokenEnc: encryptToken(data.access_token),
      refreshTokenEnc: data.refresh_token
        ? encryptToken(data.refresh_token)
        : null,
      tokenExpiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
    };
  },

  async refreshToken(connection: ConnectionRecord) {
    const result = await refreshGoogleToken({
      refresh_token_enc: connection.refresh_token_enc!,
    });
    return {
      accessToken: result.access_token,
      expiresIn: result.expires_in,
    };
  },

  async syncEvents(
    connection: ConnectionRecord,
    syncCursor: string | null,
  ): Promise<SyncResult> {
    const accessToken = decryptToken(connection.access_token_enc);
    const { events, nextSyncToken } = await fetchCalendarEvents(
      accessToken,
      syncCursor,
    );

    const normalized: NormalizedEvent[] = [];
    for (const event of events) {
      const ne = normalizeGoogleEvent(event);
      if (ne) normalized.push(ne);
    }

    return {
      events: normalized,
      nextSyncCursor: nextSyncToken,
    };
  },
};

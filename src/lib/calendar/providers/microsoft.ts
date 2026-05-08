// src/lib/calendar/providers/microsoft.ts — Microsoft Outlook Calendar provider implementation

import { encryptToken, decryptToken } from "../crypto";
import type {
  CalendarProvider,
  ConnectionRecord,
  NormalizedEvent,
  SyncResult,
} from "../types";
import { CalendarProviderError } from "../types";

// ---------------------------------------------------------------------------
// Microsoft Graph types
// ---------------------------------------------------------------------------

interface MicrosoftCalendarEvent {
  id: string;
  subject?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  attendees?: {
    emailAddress: { address: string; name?: string };
    status?: { response?: string };
  }[];
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl?: string };
  location?: { displayName?: string };
  body?: { content?: string; contentType?: string };
  changeKey?: string;
  isCancelled?: boolean;
  showAs?: string;
}

interface CalendarViewResponse {
  value?: MicrosoftCalendarEvent[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/** Microsoft OAuth refresh token -> access token */
async function refreshMicrosoftToken(connection: {
  refresh_token_enc: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const refreshToken = decryptToken(connection.refresh_token_enc);

  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Calendars.Read User.Read offline_access",
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("Microsoft token refresh failed:", body);
    throw new CalendarProviderError(
      "Microsoftトークンの更新に失敗しました",
      "microsoft",
      "TOKEN_EXPIRED",
      body,
    );
  }

  const data = await res.json();
  return { access_token: data.access_token, expires_in: data.expires_in };
}

// ---------------------------------------------------------------------------
// Event fetching
// ---------------------------------------------------------------------------

/** Fetch events from Microsoft Graph calendarView (full or delta) */
async function fetchCalendarEvents(
  accessToken: string,
  deltaLink?: string | null,
): Promise<{
  events: MicrosoftCalendarEvent[];
  nextDeltaLink: string | null;
}> {
  const allEvents: MicrosoftCalendarEvent[] = [];
  let nextDeltaLink: string | null = null;
  let url: string;

  if (deltaLink) {
    // Incremental sync via delta link
    url = deltaLink;
  } else {
    // Initial sync: past 30 days to future 90 days
    const now = new Date();
    const startDateTime = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const endDateTime = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const params = new URLSearchParams({
      startDateTime,
      endDateTime,
      $top: "250",
      $select:
        "id,subject,start,end,attendees,isOnlineMeeting,onlineMeeting,location,body,changeKey,isCancelled,showAs",
    });

    url = `https://graph.microsoft.com/v1.0/me/calendarView/delta?${params}`;
  }

  do {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 410) {
        // Delta token invalidated — caller should full-sync
        return { events: [], nextDeltaLink: null };
      }
      const body = await res.text();
      console.error("Microsoft Calendar API error:", res.status, body);
      throw new CalendarProviderError(
        "Microsoftカレンダーイベントの取得に失敗しました",
        "microsoft",
        "API_ERROR",
        body,
      );
    }

    const data: CalendarViewResponse = await res.json();
    if (data.value) {
      allEvents.push(...data.value);
    }

    if (data["@odata.deltaLink"]) {
      nextDeltaLink = data["@odata.deltaLink"];
    }

    url = data["@odata.nextLink"] ?? "";
  } while (url);

  return { events: allEvents, nextDeltaLink };
}

// ---------------------------------------------------------------------------
// Video URL extraction
// ---------------------------------------------------------------------------

const ZOOM_URL_RE = /https?:\/\/[\w.-]*zoom\.us\/[jw]\/[\w?=&-]+/i;

/** Extract video meeting URL and platform from a Microsoft Calendar event */
function extractVideoUrl(
  event: MicrosoftCalendarEvent,
): { url: string; platform: NormalizedEvent["videoPlatform"] } | null {
  // 1. Teams — native online meeting
  if (event.isOnlineMeeting && event.onlineMeeting?.joinUrl) {
    return { url: event.onlineMeeting.joinUrl, platform: "teams" };
  }

  // 2. Zoom — location or body
  for (const field of [
    event.location?.displayName,
    event.body?.content,
  ]) {
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
// Normalize a Microsoft event into the provider-agnostic NormalizedEvent format
// ---------------------------------------------------------------------------

function toUtcIso(dateTime: string, timeZone: string): string {
  // Microsoft Graph returns dateTime without a Z suffix and a separate timeZone.
  // When timeZone is "UTC" we can append Z directly; otherwise we attempt to
  // use Intl to resolve it, but fall back to treating as UTC.
  if (
    timeZone === "UTC" ||
    timeZone === "Etc/UTC" ||
    timeZone === "Etc/GMT"
  ) {
    return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
  }

  // Try to parse with the IANA timezone via Date — this works for most
  // standard IANA zone names that Graph returns.
  try {
    // Build an ISO-ish string and resolve via Intl
    const isoInput = dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    // If the formatter can resolve the zone, we create a Date from the
    // "wall-clock" value interpreted in that zone and return UTC ISO.
    // The trick: parse the dateTime as if it were UTC, compute the offset,
    // then shift.
    const asUtc = new Date(isoInput);
    const utcStr = formatter.format(asUtc);
    // If Intl resolved it, just return the original Date re-interpreted.
    // Simpler approach: use the built-in Date with timezone-naive parsing.
    // Graph dateTime is like "2024-06-15T10:00:00.0000000" — treat as
    // local time in the given zone.
    const wallDate = new Date(`${dateTime}+00:00`);
    // Get the offset between the target zone and UTC
    const parts = formatter.formatToParts(wallDate);
    // Actually, the most reliable approach: just construct a Date assuming
    // the datetime IS in that timezone. We use a different strategy:
    void utcStr;
    void parts;

    // Use Temporal-like approach with Intl.DateTimeFormat resolvedOptions
    // to get the UTC offset for the given timezone at the given instant.
    const targetDate = new Date(isoInput);
    const targetInZone = new Date(
      targetDate.toLocaleString("en-US", { timeZone }),
    );
    const targetInUtc = new Date(
      targetDate.toLocaleString("en-US", { timeZone: "UTC" }),
    );
    const offsetMs = targetInUtc.getTime() - targetInZone.getTime();

    const wallClockAsUtc = new Date(`${dateTime}Z`);
    const adjusted = new Date(wallClockAsUtc.getTime() + offsetMs);
    return adjusted.toISOString();
  } catch {
    // Fallback: treat as UTC
    return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
  }
}

function normalizeMicrosoftEvent(
  event: MicrosoftCalendarEvent,
): NormalizedEvent | null {
  if (!event.start?.dateTime || !event.end?.dateTime) return null;

  const startAt = toUtcIso(event.start.dateTime, event.start.timeZone);
  const endAt = toUtcIso(event.end.dateTime, event.end.timeZone);

  const videoInfo = extractVideoUrl(event);

  let status: NormalizedEvent["status"] = "confirmed";
  if (event.isCancelled) {
    status = "cancelled";
  } else if (event.showAs === "tentative") {
    status = "tentative";
  }

  return {
    externalId: event.id,
    title: event.subject ?? null,
    startAt,
    endAt,
    attendeeEmails:
      event.attendees?.map((a) => a.emailAddress.address.toLowerCase()) ?? [],
    videoUrl: videoInfo?.url ?? null,
    videoPlatform: videoInfo?.platform ?? null,
    etag: event.changeKey ?? null,
    status,
  };
}

// ---------------------------------------------------------------------------
// CalendarProvider implementation
// ---------------------------------------------------------------------------

export const MicrosoftCalendarProvider: CalendarProvider = {
  type: "microsoft",
  authMethod: "oauth2",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/microsoft/callback`,
      response_type: "code",
      scope: "Calendars.Read User.Read offline_access",
      response_mode: "query",
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  },

  async handleCallback(code: string) {
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/microsoft/callback`,
          grant_type: "authorization_code",
          scope: "Calendars.Read User.Read offline_access",
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new CalendarProviderError(
        `Microsoft OAuth token exchange failed: ${body}`,
        "microsoft",
        "AUTH_FAILED",
      );
    }

    const data = await res.json();

    // Fetch user email from Microsoft Graph
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (!profileRes.ok) {
      throw new CalendarProviderError(
        "Failed to fetch Microsoft user profile",
        "microsoft",
        "API_ERROR",
      );
    }

    const profile = await profileRes.json();
    const providerEmail =
      (profile.mail as string) ??
      (profile.userPrincipalName as string);

    return {
      providerEmail,
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
    const result = await refreshMicrosoftToken({
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
    const { events, nextDeltaLink } = await fetchCalendarEvents(
      accessToken,
      syncCursor,
    );

    const normalized: NormalizedEvent[] = [];
    for (const event of events) {
      const ne = normalizeMicrosoftEvent(event);
      if (ne) normalized.push(ne);
    }

    return {
      events: normalized,
      nextSyncCursor: nextDeltaLink,
    };
  },
};

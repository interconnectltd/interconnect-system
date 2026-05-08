// src/lib/calendar/providers/ics-feed.ts — ICS URL feed subscription provider

import type {
  CalendarProvider,
  ConnectionRecord,
  NormalizedEvent,
  SyncResult,
} from "../types";
import { CalendarProviderError } from "../types";
import { safeFetch, UrlGuardError } from "../url-guard";
import { decryptToken } from "../crypto";

// ---------------------------------------------------------------------------
// Video URL extraction patterns
// ---------------------------------------------------------------------------

const VIDEO_PATTERNS: { regex: RegExp; platform: NormalizedEvent["videoPlatform"] }[] = [
  { regex: /https?:\/\/[\w.-]*zoom\.us\/[jw]\/\d+[^\s)"']*/i, platform: "zoom" },
  { regex: /https?:\/\/meet\.google\.com\/[\w-]+/i, platform: "google_meet" },
  { regex: /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s)"']*/i, platform: "teams" },
];

function extractVideoUrl(
  ...fields: (string | null | undefined)[]
): { url: string; platform: NormalizedEvent["videoPlatform"] } | null {
  for (const field of fields) {
    if (!field) continue;
    for (const { regex, platform } of VIDEO_PATTERNS) {
      const match = field.match(regex);
      if (match) return { url: match[0], platform };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Minimal ICS parser (no external dependencies)
// ---------------------------------------------------------------------------

/** Unfold ICS content lines: lines starting with space/tab are continuations */
function unfoldLines(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

/** Unescape ICS text values */
function unescapeICS(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\")
    .replace(/\\;/g, ";");
}

interface RawVEvent {
  uid: string | null;
  summary: string | null;
  dtstart: string | null;
  dtend: string | null;
  location: string | null;
  description: string | null;
  attendeeEmails: string[];
  status: string | null;
}

/**
 * Parse an ICS datetime string into an ISO 8601 UTC string.
 *
 * Supported formats:
 *   20260429T140000Z          → UTC
 *   20260429T140000           → local (with optional TZID context)
 *   20260429                  → all-day (VALUE=DATE)
 *   TZID=America/New_York:20260429T140000
 */
function parseICSDateTime(raw: string): string | null {
  // Handle TZID prefix embedded in the value (from property params)
  let dateStr = raw;
  let tzid: string | null = null;

  const tzidMatch = dateStr.match(/^TZID=([^:]+):(.*)/);
  if (tzidMatch) {
    tzid = tzidMatch[1]!;
    dateStr = tzidMatch[2]!;
  }

  // Remove any remaining whitespace
  dateStr = dateStr.trim();

  // UTC format: 20260429T140000Z
  const utcMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (utcMatch) {
    const [, y, mo, d, h, mi, s] = utcMatch;
    return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  }

  // Local datetime: 20260429T140000 (with or without TZID)
  const localMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (localMatch) {
    const [, y, mo, d, h, mi, s] = localMatch;
    if (tzid) {
      // Attempt timezone conversion using Intl
      try {
        const naive = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
        // Build a date in the target timezone and find UTC offset
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tzid,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        // We need the reverse: given a wall-clock time in tzid, find UTC.
        // Strategy: Use the timezone to figure out the UTC offset at this date.
        const utcDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
        const parts = formatter.formatToParts(utcDate);
        const get = (type: string) =>
          parts.find((p) => p.type === type)?.value ?? "";
        const localInTZ = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`;
        const localDate = new Date(localInTZ);
        const offsetMs = localDate.getTime() - utcDate.getTime();
        // The actual UTC time = naive wall clock - offset
        const actualUTC = new Date(naive.getTime() - offsetMs);
        return actualUTC.toISOString().replace(/\.\d{3}Z$/, "Z");
      } catch {
        // Fallback: treat as UTC if timezone conversion fails
        return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
      }
    }
    // No TZID — treat as UTC (safest assumption for server-side)
    return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  }

  // All-day date: 20260429
  const dateOnlyMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, mo, d] = dateOnlyMatch;
    return `${y}-${mo}-${d}`;
  }

  return null;
}

/**
 * Extract property value from an ICS line like:
 *   DTSTART;TZID=America/New_York:20260429T140000
 *   DTSTART;VALUE=DATE:20260429
 *   DTSTART:20260429T140000Z
 *
 * For DTSTART/DTEND, returns TZID info prefixed to the value for parseICSDateTime.
 */
function extractPropertyValue(line: string): { name: string; value: string } | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return null;

  const beforeColon = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  // Property name is before the first ; or :
  const semiIdx = beforeColon.indexOf(";");
  const name = semiIdx === -1 ? beforeColon : beforeColon.substring(0, semiIdx);
  const params = semiIdx === -1 ? "" : beforeColon.substring(semiIdx + 1);

  // For datetime properties, prepend TZID if present
  if ((name === "DTSTART" || name === "DTEND") && params) {
    const tzidParam = params.match(/TZID=([^;]+)/);
    if (tzidParam) {
      return { name, value: `TZID=${tzidParam[1]}:${value}` };
    }
  }

  return { name, value };
}

/** Parse the full ICS text into raw VEVENT structures */
function parseVEvents(icsText: string): RawVEvent[] {
  const unfolded = unfoldLines(icsText);
  const lines = unfolded.split(/\r?\n/);

  const events: RawVEvent[] = [];
  let inEvent = false;
  let current: RawVEvent | null = null;

  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") {
      inEvent = true;
      current = {
        uid: null,
        summary: null,
        dtstart: null,
        dtend: null,
        location: null,
        description: null,
        attendeeEmails: [],
        status: null,
      };
      continue;
    }

    if (line.trim() === "END:VEVENT") {
      if (current) events.push(current);
      inEvent = false;
      current = null;
      continue;
    }

    if (!inEvent || !current) continue;

    const prop = extractPropertyValue(line);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        current.uid = prop.value;
        break;
      case "SUMMARY":
        current.summary = unescapeICS(prop.value);
        break;
      case "DTSTART":
        current.dtstart = prop.value;
        break;
      case "DTEND":
        current.dtend = prop.value;
        break;
      case "LOCATION":
        current.location = unescapeICS(prop.value);
        break;
      case "DESCRIPTION":
        current.description = unescapeICS(prop.value);
        break;
      case "STATUS":
        current.status = prop.value.toUpperCase();
        break;
      case "ATTENDEE": {
        // ATTENDEE;CN=...:mailto:email@example.com
        const emailMatch = prop.value.match(/mailto:([^\s;]+)/i);
        if (emailMatch) {
          current.attendeeEmails.push(emailMatch[1]!.toLowerCase());
        }
        break;
      }
    }
  }

  return events;
}

/** Normalize a parsed VEVENT into a NormalizedEvent */
function normalizeVEvent(raw: RawVEvent): NormalizedEvent | null {
  if (!raw.uid || !raw.dtstart) return null;

  const startAt = parseICSDateTime(raw.dtstart);
  if (!startAt) return null;

  // If no DTEND, use DTSTART (e.g., all-day single events)
  const endAt = raw.dtend ? parseICSDateTime(raw.dtend) : startAt;
  if (!endAt) return null;

  const videoInfo = extractVideoUrl(raw.location, raw.description);

  let status: NormalizedEvent["status"] = "confirmed";
  if (raw.status === "CANCELLED") status = "cancelled";
  else if (raw.status === "TENTATIVE") status = "tentative";

  return {
    externalId: raw.uid,
    title: raw.summary,
    startAt,
    endAt,
    attendeeEmails: raw.attendeeEmails,
    videoUrl: videoInfo?.url ?? null,
    videoPlatform: videoInfo?.platform ?? null,
    etag: null,
    status,
  };
}

// ---------------------------------------------------------------------------
// ICSFeedProvider implementation
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;

export const ICSFeedProvider: CalendarProvider = {
  type: "ics_feed",
  authMethod: "none",

  async syncEvents(
    connection: ConnectionRecord,
    syncCursor: string | null,
  ): Promise<SyncResult> {
    if (!connection.ics_url) {
      throw new CalendarProviderError(
        "ICS URL is not configured for this connection",
        "ics_feed",
        "API_ERROR",
      );
    }
    // ics_url is encrypted at rest (subscribe route encrypts via AES-256-GCM).
    let icsUrl: string;
    try {
      icsUrl = decryptToken(connection.ics_url);
    } catch {
      throw new CalendarProviderError(
        "ICS URL の復号に失敗しました (再連携が必要です)",
        "ics_feed",
        "API_ERROR",
      );
    }

    // Build request headers
    const headers: Record<string, string> = {
      Accept: "text/calendar, application/calendar+xml, text/plain",
      "User-Agent": "INTERCONNECT/1.0 ICS-Sync",
    };

    // Use ETag from previous sync (stored as syncCursor or ics_etag)
    const etag = syncCursor ?? connection.ics_etag ?? null;
    if (etag) {
      headers["If-None-Match"] = etag;
    }

    let response: Response;
    try {
      response = await safeFetch(icsUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      const code = err instanceof UrlGuardError ? "API_ERROR" : "API_ERROR";
      throw new CalendarProviderError(
        `Failed to fetch ICS feed: ${err instanceof Error ? err.message : String(err)}`,
        "ics_feed",
        code,
        err,
      );
    }

    // 304 Not Modified — no changes since last sync
    if (response.status === 304) {
      return {
        events: [],
        nextSyncCursor: etag,
      };
    }

    if (!response.ok) {
      throw new CalendarProviderError(
        `ICS feed returned HTTP ${response.status}: ${response.statusText}`,
        "ics_feed",
        "API_ERROR",
      );
    }

    const icsText = await response.text();
    const newEtag = response.headers.get("ETag") ?? null;

    // Parse VEVENT blocks
    let rawEvents: RawVEvent[];
    try {
      rawEvents = parseVEvents(icsText);
    } catch (err) {
      throw new CalendarProviderError(
        `Failed to parse ICS content: ${err instanceof Error ? err.message : String(err)}`,
        "ics_feed",
        "API_ERROR",
        err,
      );
    }

    // Normalize to NormalizedEvent[]
    const events: NormalizedEvent[] = [];
    for (const raw of rawEvents) {
      const normalized = normalizeVEvent(raw);
      if (normalized) events.push(normalized);
    }

    return {
      events,
      nextSyncCursor: newEtag,
    };
  },
};

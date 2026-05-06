// src/lib/calendar/index.ts — Barrel exports + provider registration

export type {
  ProviderType,
  AuthMethod,
  NormalizedEvent,
  SyncResult,
  ConnectionRecord,
  CalendarProvider,
} from "./types";
export { CalendarProviderError } from "./types";

export { encryptToken, decryptToken } from "./crypto";
export { registerProvider, getProvider } from "./registry";
export { syncCalendar } from "./service";

// --- Register built-in providers ---
import { registerProvider } from "./registry";
import { GoogleCalendarProvider } from "./google";
import { MicrosoftCalendarProvider } from "./providers/microsoft";
import { ICSFeedProvider } from "./providers/ics-feed";

registerProvider(GoogleCalendarProvider);
registerProvider(MicrosoftCalendarProvider);
registerProvider(ICSFeedProvider);

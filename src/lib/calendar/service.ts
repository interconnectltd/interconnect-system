// src/lib/calendar/service.ts — Unified CalendarService

import { encryptToken } from "./crypto";
import { getProvider } from "./registry";
import type { ConnectionRecord, SyncResult } from "./types";
import { CalendarProviderError } from "./types";
import { decryptToken } from "./crypto";

/** Check if a connection's token is expired */
function isTokenExpired(connection: ConnectionRecord): boolean {
  return (
    !connection.token_expires_at ||
    new Date(connection.token_expires_at) <= new Date()
  );
}

/**
 * Sync a calendar connection using the appropriate provider.
 * Handles token refresh automatically before syncing.
 *
 * Returns the sync result. If the sync cursor was invalidated (e.g. Google 410),
 * automatically retries with a full sync.
 */
export async function syncCalendar(
  connection: ConnectionRecord,
): Promise<{
  result: SyncResult;
  /** Non-null if tokens were refreshed and need to be persisted */
  tokenUpdate: {
    accessTokenEnc: string;
    tokenExpiresAt: string;
  } | null;
}> {
  const provider = getProvider(connection.provider);

  // --- Token refresh if needed ---
  let tokenUpdate: { accessTokenEnc: string; tokenExpiresAt: string } | null =
    null;
  let workingConnection = connection;

  if (
    provider.authMethod === "oauth2" &&
    isTokenExpired(connection) &&
    connection.refresh_token_enc &&
    provider.refreshToken
  ) {
    try {
      const refreshed = await provider.refreshToken(connection);
      const accessTokenEnc = encryptToken(refreshed.accessToken);
      const tokenExpiresAt = new Date(
        Date.now() + refreshed.expiresIn * 1000,
      ).toISOString();

      tokenUpdate = { accessTokenEnc, tokenExpiresAt };

      // Use the fresh access token for syncing
      workingConnection = {
        ...connection,
        access_token_enc: accessTokenEnc,
        token_expires_at: tokenExpiresAt,
      };
    } catch (err) {
      throw new CalendarProviderError(
        "Token refresh failed",
        connection.provider,
        "TOKEN_EXPIRED",
        err,
      );
    }
  }

  // --- Sync events ---
  const result = await provider.syncEvents(
    workingConnection,
    connection.sync_cursor,
  );

  // Handle invalidated sync cursor (retry with full sync)
  if (
    result.nextSyncCursor === null &&
    result.events.length === 0 &&
    connection.sync_cursor !== null
  ) {
    const fullResult = await provider.syncEvents(workingConnection, null);
    return { result: fullResult, tokenUpdate };
  }

  return { result, tokenUpdate };
}

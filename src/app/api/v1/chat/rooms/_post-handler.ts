/**
 * Server-side helper to create (or fetch) a chat room from an accepted
 * connection.
 *
 * Lives in `_post-handler.ts` (underscore prefix → not a route segment) so it
 * can be imported by Server Actions without conflicting with Agent A's
 * upcoming `route.ts` GET handler in the same directory. When Agent A's GET
 * handler lands, both can coexist; if Agent A wants to also expose a POST,
 * they can simply import `createRoomFromConnection` and call it.
 *
 * Contract:
 *   createRoomFromConnection(connectionId, userId)
 *     → { roomId } on success
 *     → throws Error on validation/db failure
 *
 * Validates that:
 *   - connectionId is a valid UUID
 *   - the connection exists and is accepted/reaccepted
 *   - userId is one of the two parties on the connection
 *
 * Uses createServiceClient() so the upsert can bypass RLS — caller is
 * responsible for authenticating the userId beforehand.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/sanitize";

export interface CreateRoomResult {
  roomId: string;
}

export async function createRoomFromConnection(
  connectionId: string,
  userId: string,
): Promise<CreateRoomResult> {
  if (!isValidUUID(connectionId)) {
    throw new Error("BAD_REQUEST: invalid connection id");
  }
  if (!isValidUUID(userId)) {
    throw new Error("BAD_REQUEST: invalid user id");
  }

  const service = await createServiceClient();

  // 1. Validate connection: exists, accepted, user is a party.
  const { data: connection, error: connError } = await service
    .from("connections")
    .select("id, user_id, connected_user_id, status")
    .eq("id", connectionId)
    .maybeSingle();

  if (connError) throw connError;
  if (!connection) {
    throw new Error("NOT_FOUND: connection not found");
  }
  if (
    connection.status !== "accepted" &&
    connection.status !== "reaccepted"
  ) {
    throw new Error("FORBIDDEN: connection is not accepted");
  }
  if (
    connection.user_id !== userId &&
    connection.connected_user_id !== userId
  ) {
    throw new Error("FORBIDDEN: not a party to this connection");
  }

  // 2. Compute deterministic ordering for user_a_id/user_b_id (lexical)
  //    so we can rely on the connection_id unique constraint regardless of
  //    which side initiates room creation.
  const [userA, userB] = [
    connection.user_id,
    connection.connected_user_id,
  ].sort();

  // 3. Check for existing room first — keeps the happy path side-effect-free.
  const { data: existing } = await service
    .from("chat_rooms")
    .select("id")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (existing) {
    return { roomId: existing.id };
  }

  // 4. Insert. If a race created a row between step 3 and 4, refetch.
  const { data: inserted, error: insertError } = await service
    .from("chat_rooms")
    .insert({
      connection_id: connectionId,
      user_a_id: userA,
      user_b_id: userB,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    // 23505 = unique violation → another writer won the race.
    const { data: raced } = await service
      .from("chat_rooms")
      .select("id")
      .eq("connection_id", connectionId)
      .maybeSingle();
    if (raced) return { roomId: raced.id };
    throw insertError;
  }

  if (!inserted) {
    throw new Error("INTERNAL: chat room insert returned no row");
  }

  return { roomId: inserted.id };
}

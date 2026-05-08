"use server";

/**
 * Server Actions for the Connections page.
 *
 * `startChat(connectionId)` is invoked from a `<form action={…}>` on each
 * connection card. It authenticates the current user, validates that they
 * are a party to the connection, ensures a chat_rooms row exists for it,
 * and redirects to /chat?room=<roomId>.
 *
 * Throwing here surfaces a Next.js error boundary; redirect() is a control
 * flow primitive that must not be wrapped in try/catch (it throws a
 * NEXT_REDIRECT signal Next.js catches internally).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRoomFromConnection } from "@/app/api/v1/chat/rooms/_post-handler";

export async function startChat(connectionId: string): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { roomId } = await createRoomFromConnection(connectionId, user.id);

  redirect(`/chat?room=${roomId}`);
}

/**
 * Form-action entry point: extracts connectionId from FormData and delegates
 * to startChat. Used as `<form action={startChatAction}>`.
 */
export async function startChatAction(formData: FormData): Promise<never> {
  const connectionId = formData.get("connectionId");
  if (typeof connectionId !== "string" || !connectionId) {
    throw new Error("connectionId is required");
  }
  await startChat(connectionId);
  // startChat redirects → unreachable, but keeps the type `never`.
  throw new Error("unreachable");
}

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function withAuth(): Promise<{
  user: { id: string; email: string | null };
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError();
  }

  return { user: { id: user.id, email: user.email ?? null } };
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return jsonError(401, "UNAUTHORIZED", error.message);
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }

  console.error("[api] unhandled error", error);
  return jsonError(500, "INTERNAL_ERROR", "Internal server error");
}

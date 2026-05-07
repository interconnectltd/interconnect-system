/**
 * Server-side Supabase clients for Next.js 15+ App Router.
 *
 *   - createClient()        — RLS-bound user client. Reads/writes auth cookies
 *                             via next/headers. Use in route handlers, server
 *                             actions, and RSC where the request user matters.
 *
 *   - createServiceClient() — Service-role client. NO cookies, bypasses RLS.
 *                             Use for cron jobs, webhooks, and admin paths
 *                             where action is performed on behalf of the
 *                             system, not the request user.
 *
 * Both helpers are async because Next.js 15 made `cookies()` async; the
 * service client returns a Promise too so call sites have a uniform shape.
 *
 * Env vars
 *   NEXT_PUBLIC_SUPABASE_URL       — Project URL (also used for service client
 *                                    when SUPABASE_URL is not set).
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — Anon key for user-bound client.
 *   SUPABASE_URL                   — Optional override for service client.
 *   SUPABASE_SERVICE_KEY           — Service-role key (server-only).
 */

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[supabase/server] Missing required environment variable: ${name}`,
    );
  }
  return value;
}

/**
 * Server client bound to the request's auth cookies.
 *
 * Cookie writes inside Server Components are intentionally swallowed — the
 * Next.js runtime forbids mutating cookies from RSC, but Supabase's session
 * refresh tries opportunistically. The try/catch is the documented pattern.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseAnonKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Called from a Server Component — refresh handled by middleware.
        }
      },
    },
  });
}

/**
 * Service-role client. Never reads or writes cookies; never refreshes a
 * session. Bypasses RLS — only use on trusted server paths.
 */
export async function createServiceClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = requireEnv(
    "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const serviceKey = requireEnv(
    "SUPABASE_SERVICE_KEY",
    process.env.SUPABASE_SERVICE_KEY,
  );

  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

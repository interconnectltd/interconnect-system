/**
 * Browser-side Supabase client for Next.js 15+ App Router.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at
 * call-time. Use in `'use client'` components and other browser contexts.
 *
 * Each call returns a fresh instance; if you want a singleton across the
 * client tree, memoize at the call site (e.g. with `useMemo`).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "[supabase/client] Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "[supabase/client] Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

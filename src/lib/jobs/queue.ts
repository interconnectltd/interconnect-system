/**
 * Agent A job queue helpers (canonical location).
 *
 * The legacy `worker/` directory hosted these helpers when we expected to run
 * a separate long-running worker process. For Phase 5 the dispatcher is a
 * Vercel Cron route that polls `job_queue` every 5 minutes, so the handlers
 * must live inside the Next.js TypeScript project (worker/ is excluded from
 * tsconfig). `worker/src/queue.ts` is now a thin re-export of this module.
 *
 * Architecture: CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §5.4
 *   録音 → Storage → Deepgram → meeting_transcripts → analyze ジョブ
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[jobs/queue] Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Service-role Supabase client used by the worker pipeline. Bypasses RLS —
 * only invoked from the cron route or webhook handlers, never from a client.
 *
 * Constructed lazily so module import does not blow up in environments where
 * the env vars are absent (e.g. lint, local typecheck).
 */
let _supabase: SupabaseClient<Database> | null = null;

export function getServiceClient(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const supabaseUrl = requireEnv(
    "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const serviceKey = requireEnv("SUPABASE_SERVICE_KEY", process.env.SUPABASE_SERVICE_KEY);

  _supabase = createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _supabase;
}

/**
 * Proxy export so handler code can `import { supabase } from "../queue"` and
 * stay backwards compatible with the original worker layout. The proxy defers
 * client construction until the first method call.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getServiceClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

/**
 * Insert a job into `job_queue`. Used by webhook handlers and by ingest to
 * cascade follow-up work (e.g. enqueue an "analyze" job after transcription).
 */
export async function enqueueJob(
  type: string,
  payload: Json,
  priority = 5,
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.from("job_queue").insert({
    job_type: type,
    payload,
    priority,
    status: "pending",
  });

  if (error) {
    throw new Error(`[jobs/queue] enqueueJob(${type}) failed: ${error.message}`);
  }
}

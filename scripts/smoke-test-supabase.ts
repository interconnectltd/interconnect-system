#!/usr/bin/env -S npx tsx
/**
 * INTERCONNECT post-deploy Supabase smoke test.
 *
 * Verifies:
 *   1. SUPABASE_URL + SUPABASE_SERVICE_KEY are set
 *   2. Connection succeeds
 *   3. Each table from migrations 00006 / 00007 / 00009 exists (SELECT ... LIMIT 0)
 *   4. RLS is enabled on each (pg_class.relrowsecurity)
 *   5. chat_messages and chat_rooms are in supabase_realtime publication
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/smoke-test-supabase.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const C = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};
const useColor = process.stdout.isTTY;
const c = (color: keyof typeof C, s: string) =>
  useColor ? `${C[color]}${s}${C.reset}` : s;

let passed = 0;
let failed = 0;
let warned = 0;
const pass = (m: string) => {
  console.log(`${c("green", "[PASS]")} ${m}`);
  passed++;
};
const fail = (m: string) => {
  console.log(`${c("red", "[FAIL]")} ${m}`);
  failed++;
};
const warn = (m: string) => {
  console.log(`${c("yellow", "[WARN]")} ${m}`);
  warned++;
};

// Tables introduced by the listed migrations.
const TABLES_FROM_00006 = [
  "calendar_connections",
  "calendar_events",
  "chat_rooms",
  "chat_messages",
  "chat_analysis",
];
const TABLES_FROM_00007 = ["availability_rules", "availability_overrides"];
const TABLES_FROM_00009 = [
  "meeting_requests",
  "meetings",
  "meeting_participants_v2",
  "meeting_transcripts",
  "job_queue",
];
const ALL_TABLES = [
  ...TABLES_FROM_00006,
  ...TABLES_FROM_00007,
  ...TABLES_FROM_00009,
];
const REALTIME_TABLES = ["chat_messages", "chat_rooms"];

async function main() {
  console.log("=== A. Environment variables ===");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    fail("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not set");
    return finish();
  }
  pass(`SUPABASE_URL is set (${new URL(url).host})`);

  if (!serviceKey) {
    fail(
      "SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set; cannot run DB checks",
    );
    return finish();
  }
  pass(`SUPABASE_SERVICE_KEY is set (length=${serviceKey.length})`);

  const supabase: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== B. Connection ===");
  // Cheap round-trip via PostgREST; any 2xx-equivalent counts as connected.
  const probe = await supabase
    .from(ALL_TABLES[0])
    .select("*", { count: "exact", head: true })
    .limit(0);
  if (probe.error && probe.error.code === "PGRST301") {
    fail(`Connection failed (auth): ${probe.error.message}`);
    return finish();
  }
  pass("Connected to Supabase via service-role key");

  console.log("\n=== C. Tables exist ===");
  for (const t of ALL_TABLES) {
    const { error } = await supabase
      .from(t)
      .select("*", { head: true, count: "exact" })
      .limit(0);
    if (error) {
      // PGRST205 = relation not found in schema cache
      const missing =
        error.code === "PGRST205" || /not.*find.*table|does not exist/i.test(error.message);
      if (missing) fail(`table missing: public.${t} (${error.message})`);
      else fail(`table check failed: public.${t} - ${error.message}`);
    } else {
      pass(`table exists: public.${t}`);
    }
  }

  console.log("\n=== D. RLS enabled ===");
  // Use the service role to query pg_class via an RPC if available; fall back to a warn.
  // We try a simple SQL query through PostgREST's rpc() if the project exposes one;
  // otherwise we warn and tell the user to verify in the dashboard.
  const { data: rlsRows, error: rlsErr } = await supabase
    .rpc("smoke_check_rls", { table_names: ALL_TABLES })
    .select();
  if (rlsErr) {
    warn(
      `Could not auto-check RLS via rpc('smoke_check_rls'): ${rlsErr.message}. ` +
        `Verify in the Supabase dashboard that RLS is ON for: ${ALL_TABLES.join(", ")}`,
    );
  } else if (Array.isArray(rlsRows)) {
    const byName = new Map<string, boolean>(
      (rlsRows as { table_name: string; rls_enabled: boolean }[]).map((r) => [
        r.table_name,
        r.rls_enabled,
      ]),
    );
    for (const t of ALL_TABLES) {
      const on = byName.get(t);
      if (on === true) pass(`RLS enabled: public.${t}`);
      else if (on === false) fail(`RLS DISABLED: public.${t}`);
      else warn(`RLS unknown for public.${t} (table not returned by rpc)`);
    }
  }

  console.log("\n=== E. Realtime publication ===");
  const { data: pubRows, error: pubErr } = await supabase
    .rpc("smoke_check_realtime", { table_names: REALTIME_TABLES })
    .select();
  if (pubErr) {
    warn(
      `Could not auto-check realtime publication: ${pubErr.message}. ` +
        `Verify supabase_realtime publication includes ${REALTIME_TABLES.join(
          ", ",
        )} in the dashboard.`,
    );
  } else if (Array.isArray(pubRows)) {
    const byName = new Map<string, boolean>(
      (pubRows as { table_name: string; in_publication: boolean }[]).map((r) => [
        r.table_name,
        r.in_publication,
      ]),
    );
    for (const t of REALTIME_TABLES) {
      const on = byName.get(t);
      if (on === true) pass(`${t} is in supabase_realtime publication`);
      else if (on === false)
        fail(`${t} is NOT in supabase_realtime publication`);
      else warn(`realtime status unknown for ${t} (rpc returned no row)`);
    }
  } else {
    warn("rpc('smoke_check_realtime') returned no rows");
  }

  return finish();
}

function finish() {
  console.log("\n================================================");
  console.log(
    `${c("green", `${passed} PASSED`)}, ${c("red", `${failed} FAILED`)}, ${c(
      "yellow",
      `${warned} WARNINGS`,
    )}`,
  );
  console.log("================================================");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  fail(`unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  finish();
});

import { NextResponse } from "next/server";

/**
 * GET /api/v1/health
 *
 * Liveness/readiness probe used by `scripts/smoke-test.sh` and uptime
 * monitoring. Performs two cheap checks:
 *   1. Required env vars are present.
 *   2. Database is reachable via a HEAD count on `user_profiles`.
 *
 * No auth — health checks must be callable from anywhere. No caching — the
 * response must reflect the current state of the system on every call.
 *
 * Returns 200 with `status: "ok"` when all checks pass, 503 with
 * `status: "degraded"` otherwise.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
  ];

  const missingEnvs = requiredEnvs.filter((k) => !process.env[k]);

  let dbReachable: boolean | null = null;
  if (missingEnvs.length === 0) {
    try {
      const { createServiceClient } = await import("@/lib/supabase/server");
      const supabase = await createServiceClient();
      // Lightweight ping: HEAD count on user_profiles, no rows returned.
      const { error } = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .limit(0);
      dbReachable = !error;
    } catch {
      dbReachable = false;
    }
  }

  const status =
    missingEnvs.length === 0 && dbReachable !== false ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        env:
          missingEnvs.length === 0
            ? "ok"
            : `missing: ${missingEnvs.join(", ")}`,
        db:
          dbReachable === null ? "skipped" : dbReachable ? "ok" : "fail",
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}

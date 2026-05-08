import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/jobs/queue";
import { handleIngest, type IngestPayload } from "@/lib/agent-a/ingest";

/**
 * GET /api/v1/jobs/cron
 *
 * Vercel Cron handler: drains pending rows from `job_queue` every 5 minutes.
 * Uses optimistic locking (`.eq('status','pending')` on UPDATE) so two cron
 * invocations cannot pick up the same row twice — if a parallel invoker
 * raced ahead and flipped the row to 'running', the UPDATE matches zero
 * rows and we skip cleanly.
 *
 * Architecture: CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §5 / §6.2
 *   Zoom Webhook → job_queue insert → THIS CRON → handleIngest → analyze
 *
 * One job's failure is isolated by try/catch so it cannot poison sibling
 * jobs in the same batch. Each terminal state writes back to job_queue:
 *   success → status='completed'
 *   failure → status='failed' + last_error
 */

// Service-role bypass + outbound HTTP (Deepgram, recording fetch) → Node runtime.
export const runtime = "nodejs";
// Never cache the cron response.
export const dynamic = "force-dynamic";

const BATCH_SIZE = 5;

interface JobRow {
  id: string;
  job_type: string;
  payload: unknown;
  attempts: number | null;
}

export async function GET(request: NextRequest) {
  // --- Auth: verify the request comes from Vercel Cron ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/jobs] CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  // -------------------------------------------------------
  // Pull a batch of due jobs (status='pending', scheduled_at <= now).
  // priority DESC means lower numbers run first (priority=2 before 5).
  // -------------------------------------------------------
  const { data: candidates, error: fetchError } = await supabase
    .from("job_queue")
    .select("id, job_type, payload, attempts")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("priority", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[cron/jobs] Failed to fetch jobs:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0, skipped: 0 });
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const candidate of candidates as JobRow[]) {
    // ---------------------------------------------------
    // Optimistic lock: flip pending → running, scoped by id+status.
    // If another invoker grabbed it first, claimed.length === 0.
    // ---------------------------------------------------
    const { data: claimed, error: claimError } = await supabase
      .from("job_queue")
      .update({
        status: "running",
        attempts: (candidate.attempts ?? 0) + 1,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("id");

    if (claimError) {
      console.error(
        `[cron/jobs] Claim failed for job ${candidate.id}:`,
        claimError,
      );
      failed++;
      continue;
    }

    if (!claimed || claimed.length === 0) {
      // Lost the race; another worker has it.
      skipped++;
      continue;
    }

    // ---------------------------------------------------
    // Execute, isolated per-job.
    // ---------------------------------------------------
    try {
      await runJob(candidate.job_type, candidate.payload);

      const { error: doneError } = await supabase
        .from("job_queue")
        .update({ status: "completed", last_error: null })
        .eq("id", candidate.id);

      if (doneError) {
        console.error(
          `[cron/jobs] Completion update failed for ${candidate.id}:`,
          doneError,
        );
      }

      processed++;
      console.log(
        `[cron/jobs] Completed job ${candidate.id} (${candidate.job_type})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[cron/jobs] Job ${candidate.id} (${candidate.job_type}) failed:`,
        message,
      );

      const { error: failError } = await supabase
        .from("job_queue")
        .update({
          status: "failed",
          last_error: message.slice(0, 2000),
        })
        .eq("id", candidate.id);

      if (failError) {
        console.error(
          `[cron/jobs] Failure update failed for ${candidate.id}:`,
          failError,
        );
      }

      failed++;
    }
  }

  return NextResponse.json({ processed, failed, skipped });
}

/**
 * Dispatch a single job to its handler. Add new job_type branches here as
 * the pipeline grows (analyze, notify, …). Unknown types throw so the row
 * is marked failed instead of silently completed.
 */
async function runJob(jobType: string, payload: unknown): Promise<void> {
  switch (jobType) {
    case "ingest": {
      assertIngestPayload(payload);
      await handleIngest(payload);
      return;
    }
    default:
      // analyze / notify / etc. land here until handlers are wired up.
      throw new Error(`Unknown job_type: ${jobType}`);
  }
}

function assertIngestPayload(payload: unknown): asserts payload is IngestPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("ingest payload is not an object");
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.meeting_id !== "string") {
    throw new Error("ingest payload missing meeting_id");
  }
  if (typeof p.recording_url !== "string") {
    throw new Error("ingest payload missing recording_url");
  }
  if (!Array.isArray(p.participant_ids)) {
    throw new Error("ingest payload missing participant_ids array");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/retention/cron
 *
 * Vercel Cron handler: enforces the 90-day text-content retention policy
 * referenced in CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §11 / §12 V6.
 *
 * Privacy commitment (§11 line 779):
 *   - 音声: 文字起こし完了後即削除 (handled in worker/ingest path)
 *   - テキスト: 90日後null化 (this cron)
 *
 * Idempotent and safe to re-run. Each table is wrapped in its own try/catch
 * so a missing migration (e.g. meeting_transcripts not yet created) does not
 * abort the run for the other tables.
 *
 * Schedule: 18:00 UTC = 03:00 JST (off-peak Japan time).
 */

const RETENTION_DAYS = 90;

type NullifyResult =
  | { ok: true; count: number }
  | { ok: false; error: string; skipped?: boolean };

export async function GET(request: NextRequest) {
  // --- Auth: verify the request comes from Vercel Cron ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/retention] CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 86_400_000,
  ).toISOString();

  // --- 1. chat_messages.content (current chat table) -----------------------
  const chatMessages = await safeRun(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (serviceClient.from("chat_messages") as any)
      .update({ content: "" })
      .lt("created_at", cutoff)
      .in("content_type", ["text", "image", "file"])
      .neq("content", "")
      .select("id", { count: "exact" });
    if (error) throw error;
    return data ? data.length : (count ?? 0);
  });

  // --- 2. messages.content (legacy DM table) -------------------------------
  const messages = await safeRun(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (serviceClient.from("messages") as any)
      .update({ content: "" })
      .lt("created_at", cutoff)
      .neq("content", "")
      .select("id", { count: "exact" });
    if (error) throw error;
    return data ? data.length : (count ?? 0);
  });

  // --- 3. meeting_transcripts.text -----------------------------------------
  // TODO: This table is referenced in worker/src/handlers/ingest.ts but is
  // not yet declared in any supabase/migrations file. Once the migration
  // lands, this branch will start nullifying transcripts naturally. Until
  // then, the catch below logs and continues.
  const meetingTranscripts = await safeRun(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (serviceClient.from("meeting_transcripts" as never) as any)
      .update({ text: null })
      .lt("created_at", cutoff)
      .not("text", "is", null)
      .select("id", { count: "exact" });
    if (error) throw error;
    return data ? data.length : (count ?? 0);
  });

  // --- 4. chat_analysis (extracted_topics / needs / offers / signals) ------
  // TODO: Discuss before enabling. The architecture doc keeps analysis rows
  // because they feed matching scores even after raw content is gone. If we
  // later decide to also age out the structured extractions, the shape would
  // be roughly:
  //
  //   await serviceClient
  //     .from("chat_analysis")
  //     .update({
  //       extracted_topics: [],
  //       extracted_needs: [],
  //       extracted_offers: [],
  //       engagement_signals: {},
  //     })
  //     .lt("created_at", cutoff);
  //
  // Intentionally not executed for now.

  const summary = {
    cutoff,
    retention_days: RETENTION_DAYS,
    chat_messages_nullified: countOf(chatMessages),
    messages_nullified: countOf(messages),
    meeting_transcripts_nullified: countOf(meetingTranscripts),
    errors: [
      errorOf("chat_messages", chatMessages),
      errorOf("messages", messages),
      errorOf("meeting_transcripts", meetingTranscripts),
    ].filter((e): e is { table: string; error: string; skipped?: boolean } =>
      e !== null,
    ),
  };

  console.log("[cron/retention] completed", summary);

  return NextResponse.json(summary);
}

/**
 * Wrap a per-table update so a missing migration / unknown table does not
 * abort the entire cron run. Errors that look like "relation does not exist"
 * are flagged as `skipped` instead of `error` so dashboards can distinguish
 * "table not yet created" from "real failure".
 */
async function safeRun(fn: () => Promise<number>): Promise<NullifyResult> {
  try {
    const count = await fn();
    return { ok: true, count };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const skipped =
      /does not exist|relation .* does not exist|schema cache/i.test(message);
    if (skipped) {
      console.warn("[cron/retention] table not present, skipping:", message);
      return { ok: false, error: message, skipped: true };
    }
    console.error("[cron/retention] update failed:", message);
    return { ok: false, error: message };
  }
}

function countOf(r: NullifyResult): number {
  return r.ok ? r.count : 0;
}

function errorOf(
  table: string,
  r: NullifyResult,
): { table: string; error: string; skipped?: boolean } | null {
  if (r.ok) return null;
  return { table, error: r.error, skipped: r.skipped };
}

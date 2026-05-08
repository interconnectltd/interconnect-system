/**
 * Thin re-export of the canonical Agent A ingest handler.
 *
 * The actual implementation lives in src/lib/agent-a/ingest.ts so it can
 * be type-checked with the rest of the Next.js project (worker/ is excluded
 * from tsconfig). This file exists only so legacy paths that import from
 * `worker/src/handlers/ingest` keep resolving.
 */

export {
  handleIngest,
  type IngestPayload,
} from "../../../src/lib/agent-a/ingest";

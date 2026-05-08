/**
 * Thin re-export of the canonical Agent A job-queue helpers.
 *
 * The actual implementation lives in src/lib/jobs/queue.ts so it can be
 * type-checked alongside the rest of the Next.js TypeScript project
 * (worker/ is excluded from tsconfig.json). This file exists so that
 * worker/src/handlers/* can use the conventional `../queue` import path
 * without breaking at runtime.
 *
 * See: src/lib/jobs/queue.ts header for the architectural context.
 */

export * from "../../src/lib/jobs/queue";

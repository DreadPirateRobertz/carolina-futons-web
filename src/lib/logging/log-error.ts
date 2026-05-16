// General-purpose error logger. Generalizes the logWixFailure pattern from
// src/lib/wix/errors.ts so non-Wix code paths (admin endpoints, audit log,
// background ops) can ship to Sentry with the same shape — `[source] op
// failed` prefix on console.error, captureException at level=error, and
// awaited flush so serverless handlers don't drop events.
//
// When to pick which:
//   - Wix SDK reader call sites → logWixFailure (downgrades expected
//     upstream outages to level=warning so the wix-sdk alert threshold
//     stays meaningful).
//   - Everything else → logError (every event is a real error worth
//     paging).

import * as Sentry from "@sentry/nextjs";

/**
 * Optional structured context attached to both the console line and the
 * Sentry `extra` field. Keys land in Sentry verbatim; values are coerced
 * via JSON.stringify on the Sentry side, so prefer flat primitive-valued
 * shapes (string / number / boolean / null) over deeply nested objects.
 */
export type LogExtra = Record<string, unknown>;

/**
 * Log an unexpected error to console.error and Sentry, then await
 * Sentry.flush so the event ships before a serverless function freezes.
 *
 * Format mirrors logWixFailure (cfw-1ol0): a single
 * `[source] op failed` prefix line followed by a structured context
 * object, plus a Sentry event tagged with `{ source, op }`. The flush
 * timeout is 2 s — Sentry-recommended ceiling for serverless handlers;
 * any longer risks the Vercel function timing out before the POST
 * completes.
 *
 * @param source - Short module / feature tag for the prefix and the
 *   Sentry `tags.source`. Examples: "audit-log", "newsletter",
 *   "admin/site-content". Stable across invocations of the same call
 *   site.
 * @param op - The operation that failed. Use the function or webhook
 *   name; this becomes `tags.op` in Sentry so a single source's
 *   different failure modes group cleanly. Examples: "record",
 *   "validateSignature", "items.save".
 * @param err - The caught error. Anything is accepted — non-Error
 *   throwables stringify via `String(err)` before going to the
 *   console line, but the original value still flows to
 *   Sentry.captureException so the SDK can extract a stack if there
 *   is one.
 * @param extra - Optional structured context. Merged into both the
 *   console object and Sentry's `extra`. Avoid PII — hash or redact
 *   first (see cfw-coc).
 * @returns Resolves after Sentry.flush(2000). Never throws — a flush
 *   timeout is swallowed because the caller's path is already in an
 *   error branch and there's nothing useful it can do with a
 *   secondary failure.
 *
 * WHY level=error (not warning) on every call: logError is the path
 * for "we did not expect this." Wix outages are routed through
 * logWixFailure so they don't pollute the level=error alert
 * threshold. If you find yourself wanting level=warning here, the
 * call probably belongs in a Wix-specific helper instead.
 */
export async function logError(
  source: string,
  op: string,
  err: unknown,
  extra: LogExtra = {},
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${source}] ${op} failed`, { message, ...extra });
  Sentry.captureException(err, {
    level: "error",
    tags: { source, op },
    extra: { message, ...extra },
  });
  try {
    await Sentry.flush(2000);
  } catch {
    // Swallow — the caller is already in an error branch; a secondary
    // Sentry-transport failure is not worth surfacing here.
  }
}

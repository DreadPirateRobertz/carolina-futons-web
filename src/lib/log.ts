import * as Sentry from "@sentry/nextjs";

/**
 * Generic error logger for routes/components that aren't tied to the Wix SDK.
 *
 * Sibling of `logWixFailure` in `src/lib/wix/errors.ts`: same Sentry-flush
 * pattern so a serverless function doesn't freeze before the event ships,
 * but without the Wix-shape classifier (no `isWixSdkError` tag — callers
 * passing a Wix error should use `logWixFailure` for the proper warning vs
 * error level split).
 *
 * @param source - Short tag for the failing surface (e.g. `"checkout"`,
 *   `"audit-log"`). Surfaces in the `[source]` console prefix and as a
 *   Sentry tag so dashboards can pivot by failing area.
 * @param op - Operation that failed (e.g. `"initCheckout"`). Surfaces in
 *   the console message and as a Sentry tag for sub-surface filtering.
 * @param err - The thrown value. Anything is accepted; non-Error throws
 *   are stringified into the Sentry `extra.message`.
 *
 * @remarks
 * Awaits `Sentry.flush(2000)` because Vercel serverless freezes the
 * function as soon as the response stream completes; without the flush,
 * `captureException` queues the event and the HTTP POST to Sentry is
 * cancelled. 2 s is the Sentry-recommended ceiling for serverless.
 */
export async function logError(
  source: string,
  op: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${source}] ${op} failed`, { message });
  Sentry.captureException(err, {
    level: "error",
    tags: { source, op },
    extra: { message },
  });
  await Sentry.flush(2000);
}

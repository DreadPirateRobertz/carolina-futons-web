// Shared Wix SDK error helpers. Extracted from plp.ts / products.ts /
// product/cross-sell.ts where three near-duplicate copies had drifted apart
// on the `WixErrorShape` fields and log prefix. Callers now pass a `source`
// tag so the Sentry/console output still identifies which reader failed.
import * as Sentry from "@sentry/nextjs";

/**
 * Structural subset of Wix SDK error objects. The SDK doesn't export an error
 * type, so readers pattern-match on these fields to separate "Wix said no"
 * from "programmer bug" when tagging Sentry events.
 */
export type WixErrorShape = {
  code?: string;
  message?: string;
  details?: { applicationError?: { code?: string; description?: string } };
  response?: { status?: number };
};

/**
 * Structural predicate for Wix SDK errors. Returns true when the error has
 * ANY of: a top-level string `code`, a `details.applicationError` object, or
 * a numeric `response.status`. A plain `Error` without these fields is
 * classified as unexpected (programmer bug) rather than Wix outage.
 */
export function isWixSdkError(err: unknown): err is WixErrorShape {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "string") return true;
  const details = e.details as { applicationError?: unknown } | undefined;
  if (details?.applicationError && typeof details.applicationError === "object")
    return true;
  const response = e.response as { status?: unknown } | undefined;
  if (typeof response?.status === "number") return true;
  return false;
}

/**
 * Reader error tag surfaced on `{items, error?}` return shapes across the
 * reader layer (plp.ts, cross-sell.ts, etc.). Callers MUST branch on this
 * before rendering the silent empty-state — "wix_sdk" and "unexpected" are
 * intentionally the only values so UIs can show one error copy without
 * switching per kind.
 */
export type ReaderError = "wix_sdk" | "unexpected";

/**
 * Reduces an arbitrary caught error to a `ReaderError` tag for inclusion in a
 * reader's return shape. Never throws; a non-Wix error falls through to
 * "unexpected".
 */
export function toReaderError(err: unknown): ReaderError {
  return isWixSdkError(err) ? "wix_sdk" : "unexpected";
}

/**
 * Logs a reader failure to console.error (with a `[source]` prefix) and to
 * Sentry (captureException + tags + extras) and awaits Sentry.flush(2000) so
 * the event ships before the serverless function freezes.
 *
 * Level is "warning" for Wix-shaped errors (expected upstream outage) and
 * "error" for everything else (programmer bug / network / misconfig) so the
 * two classes don't pollute each other's alert thresholds.
 *
 * The awaited flush is load-bearing on Vercel — without it, captureException
 * queues the event and the request dies before Sentry's HTTP POST completes.
 * 2s is the Sentry-recommended ceiling for serverless handlers.
 */
export async function logWixFailure(
  source: string,
  op: string,
  err: unknown,
): Promise<void> {
  const wix = isWixSdkError(err) ? err : null;
  const code = wix?.code ?? wix?.details?.applicationError?.code;
  const httpStatus = wix?.response?.status;
  const message = err instanceof Error ? err.message : String(err);
  const kind = wix ? "wix-sdk" : "unexpected";
  console.error(`[${source}] ${op} failed`, { kind, code, httpStatus, message });
  Sentry.captureException(err, {
    level: wix ? "warning" : "error",
    tags: { source, op, kind },
    extra: { code, httpStatus, message },
  });
  await Sentry.flush(2000);
}

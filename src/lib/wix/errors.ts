// Shared Wix SDK error helpers. Extracted from plp.ts / products.ts /
// product/cross-sell.ts where three near-duplicate copies had drifted apart
// on the `WixErrorShape` fields and log prefix. Callers now pass a `source`
// tag so the Sentry/console output still identifies which reader failed.
import * as Sentry from "@sentry/nextjs";

export type WixErrorShape = {
  code?: string;
  message?: string;
  details?: { applicationError?: { code?: string; description?: string } };
  response?: { status?: number };
};

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

export type ReaderError = "wix_sdk" | "unexpected";

export function toReaderError(err: unknown): ReaderError {
  return isWixSdkError(err) ? "wix_sdk" : "unexpected";
}

// Await flush so Sentry's HTTP POST completes before Vercel freezes the
// serverless function — otherwise captureException queues the event and the
// request dies before it ships. 2s is the Sentry-recommended ceiling for
// serverless handlers.
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

import * as Sentry from "@sentry/nextjs";

/**
 * Payload type accepted by {@link logError}. Either a real Error
 * (Sentry parses the stack) or a plain context object (Sentry attaches
 * the fields as `extra` on a synthesized message-event).
 */
export type LogErrorPayload = Error | Record<string, unknown>;

/**
 * Standard error-log entry point. Replaces ad-hoc `console.error`
 * calls with one that emits to both stderr (for local dev + log
 * aggregation) and Sentry (for prod alerting).
 *
 * Why both: console output keeps the local-dev / `vercel logs` greppable
 * even when Sentry is sample-rate-limited or unavailable; Sentry is the
 * source of truth for prod alert routing.
 *
 * @param scope - Short identifier for the call site (e.g. "notify-me",
 *   "auth/owner"). Becomes both the `[scope]` prefix in the console
 *   line and the Sentry `source` tag for alert routing.
 * @param message - Human-readable description of the failure. Keep
 *   message-only — never interpolate values; put values in `payload`.
 * @param payload - Optional Error or context object. Error instances
 *   are sent through `Sentry.captureException` (preserves stack);
 *   plain objects are sent through `Sentry.captureMessage` with the
 *   fields attached as `extra`.
 */
export function logError(
  scope: string,
  message: string,
  payload?: LogErrorPayload,
): void {
  // Always emit to console — dev/local-grep + log-aggregation trail.
  // Distinct branches so the console output doesn't read `undefined`
  // when no payload was provided.
  if (payload === undefined) {
    console.error(`[${scope}] ${message}`);
  } else {
    console.error(`[${scope}] ${message}`, payload);
  }

  if (payload instanceof Error) {
    Sentry.captureException(payload, {
      tags: { source: scope },
      extra: { message },
    });
    return;
  }

  // Non-Error path: synthesize a Sentry message event so alert routing
  // still fires. Spread payload directly onto `extra` so each field
  // shows up as a top-level breadcrumb attribute in the Sentry UI
  // (rather than nested under a `meta` key).
  Sentry.captureMessage(message, {
    level: "error",
    tags: { source: scope },
    extra: payload ? { ...payload } : undefined,
  });
}

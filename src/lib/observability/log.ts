import * as Sentry from "@sentry/nextjs";

/**
 * Standard structured error logger for cfw server code. Wraps the
 * `console.error("[scope] message", err)` + `Sentry.captureException` +
 * `Sentry.flush(2000)` triad so callers stop hand-rolling the prefix
 * string and the await-flush dance.
 *
 * Mirrors `logWixFailure`'s shape (in `src/lib/wix/errors.ts`) but
 * targets the **non-Wix** error class — programmer bugs, missing
 * config, fetch failures against non-Wix HTTP endpoints, anything
 * that should land in Sentry at `level: error` rather than the
 * `level: warning` reserved for upstream-outage signals.
 *
 * @param scope - Module / source identifier. Appears as the
 *   `[scope]` prefix on `console.error` and as the Sentry `scope` tag.
 *   Conventionally a short lowercase token, e.g. `"checkout"`,
 *   `"newsletter"`, `"admin/site-content"`.
 * @param message - Human-readable summary, e.g. `"initCheckout failed"`.
 *   Appears after the prefix on `console.error` and as the Sentry `op`
 *   tag (matches `logWixFailure`'s `op` so the two loggers's Sentry
 *   tags compose cleanly in dashboards).
 * @param err - Optional thrown value. Passed to
 *   `Sentry.captureException` verbatim. When omitted, the call still
 *   emits a Sentry event — treat as an assertion-style "this branch
 *   shouldn't run, here's the state when it did" signal.
 * @param extra - Optional structured context. Merged into the Sentry
 *   `extra` payload and printed as the trailing arg to `console.error`
 *   for grep-ability.
 * @returns Promise that resolves after `Sentry.flush` completes, with
 *   a 2-second ceiling (the Sentry-recommended bound for serverless
 *   handlers — without flush the request dies before the HTTP POST
 *   makes it out the door).
 *
 * @example
 *   try {
 *     await initCheckout(...);
 *   } catch (err) {
 *     await logError("checkout", "initCheckout failed", err);
 *     return NextResponse.redirect("/cart?checkout_error=1");
 *   }
 *
 * WHY: cfw server modules currently repeat
 * `console.error("[<scope>] <msg>", err)` plus a separate hand-rolled
 * `Sentry.captureException` call across roughly a dozen routes/actions.
 * The pattern drifts: some callers forget `Sentry.flush`, some omit
 * the prefix bracket, some pass the error as the message string. A
 * single helper pins the format, the Sentry tags (`scope`, `op`), and
 * the flush — and gives the test suite ONE thing to mock instead of
 * every caller having to stub `@sentry/nextjs`.
 *
 * The `await Sentry.flush(2000)` is load-bearing on Vercel. Without
 * it, `captureException` queues the event in memory and the request
 * dies before Sentry's HTTPS POST completes — the error never reaches
 * the dashboard. 2s is the Sentry-recommended ceiling; longer holds
 * a serverless handler open past Vercel's response budget for no
 * additional visibility.
 */
export async function logError(
  scope: string,
  message: string,
  err?: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (extra !== undefined) {
    console.error(`[${scope}] ${message}`, err, extra);
  } else if (err !== undefined) {
    console.error(`[${scope}] ${message}`, err);
  } else {
    console.error(`[${scope}] ${message}`);
  }

  Sentry.captureException(err ?? new Error(`[${scope}] ${message}`), {
    level: "error",
    tags: { scope, op: message },
    extra,
  });

  await Sentry.flush(2000);
}

/**
 * Structured warning logger — same shape as `logError` but emits at
 * Sentry `level: "warning"` and via `console.warn` instead of
 * `console.error`. Use this for:
 *   - Rate-limit hits (user-induced traffic that's worth tracking
 *     trend-wise but should NOT page on-call).
 *   - Soft-fail upstream signals where the request still completed
 *     (e.g. token refresh attempted but server kept the old token).
 *   - Deprecation warnings, unrecognized input shapes, anything the
 *     caller wants to surface for trend analysis without escalating
 *     to error severity.
 *
 * Sentry filters on `level` for alert routing, so the warning/error
 * split is load-bearing: warnings stay in the dashboard at low
 * priority, errors page on-call.
 *
 * @param scope - Module / source identifier. Same shape as logError's
 *   `scope`; the two helpers compose cleanly so a single Sentry filter
 *   on `tags.scope` shows both warnings and errors from one module.
 * @param message - Human-readable summary, e.g. `"rate-limited"`.
 *   Becomes the Sentry `op` tag.
 * @param err - Optional thrown value (warnings usually don't have
 *   one; pass when there's a useful trace).
 * @param extra - Optional structured context. Merged into the Sentry
 *   `extra` payload and printed as the trailing arg to `console.warn`.
 *
 * @example
 *   if (err instanceof RateLimitError) {
 *     await logWarn("newsletter", "rate-limited", err, { emailHash });
 *     return { status: "error", error: "Please try again shortly." };
 *   }
 *
 * WHY a separate helper instead of a `level` param on logError: alert
 * routing is the contract we want to make hard to mis-set. A typo in
 * `"warning" → "error"` would silently page on-call on every rate
 * limit; making it two distinct exports forces the caller to think
 * about which signal they're emitting.
 */
export async function logWarn(
  scope: string,
  message: string,
  err?: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (extra !== undefined) {
    console.warn(`[${scope}] ${message}`, err, extra);
  } else if (err !== undefined) {
    console.warn(`[${scope}] ${message}`, err);
  } else {
    console.warn(`[${scope}] ${message}`);
  }

  Sentry.captureException(err ?? new Error(`[${scope}] ${message}`), {
    level: "warning",
    tags: { scope, op: message },
    extra,
  });

  await Sentry.flush(2000);
}

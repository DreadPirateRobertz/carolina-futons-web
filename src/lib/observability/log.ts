// Structured client-side error logger.
//
// Until now, components in cfutons_web that needed to log a caught error
// reached for `console.error("[scope] message", err)` directly. Three
// problems with that pattern:
//
//   1. No standard shape — every call site picks its own prefix format
//      (some bracketed, some not), making log scraping in production
//      brittle.
//   2. No bridge to Sentry — production users hit errors that never
//      surface to engineering because the path is "log to user's
//      devtools and forget."
//   3. No way to silence in tests — components under vitest spam
//      stderr unless every test sets up its own console.error spy.
//
// `logError(scope, message, err?, extra?)` standardises all three:
//
//   - Emits `[scope] message` to console.error in dev/test (visible
//     in `npm run dev` + vitest output, matching existing habits).
//   - Forwards the same payload to Sentry's captureException in
//     production via @sentry/nextjs. Lazy-imports the SDK so test
//     and dev builds don't pay the bundle cost.
//   - Returns void so call sites read like `console.error` does
//     today — drop-in migration target.
//
// First migration: PdpWishlistButton (single console.error call).
// Future migrations: the rest of the rg-discovered call sites get
// rolled over one PR at a time so each migration stays small and
// reviewable.

export type LogContext = Readonly<Record<string, unknown>>;

/**
 * Log a caught error with a standard shape and forward to Sentry in
 * production. Drop-in replacement for `console.error("[scope] msg", err)`.
 *
 * @param scope - short bracketed prefix identifying the call site
 *   (e.g. "PdpWishlistButton"). Mirrors the de-facto convention
 *   already used by the codebase's console.error calls so the migrated
 *   log line is byte-identical to what it replaced.
 * @param message - short human description of the operation that
 *   failed (e.g. "sign-in init failed"). Combined with `scope` into
 *   `[scope] message` for the console line.
 * @param err - the caught value. May be an Error, a thrown string, or
 *   anything else (Wix SDK occasionally throws non-Error). Forwarded
 *   to Sentry as-is via captureException, which handles non-Error
 *   input.
 * @param extra - optional structured context passed through to
 *   Sentry's `extra` field. Skipped when undefined to keep the
 *   captureException call site minimal.
 */
export function logError(
  scope: string,
  message: string,
  err?: unknown,
  extra?: LogContext,
): void {
  const prefix = `[${scope}] ${message}`;
  // Always emit to console — visible in dev devtools, vitest stderr,
  // and Vercel logs (which capture stderr from server components).
  if (err !== undefined) {
    console.error(prefix, err);
  } else {
    console.error(prefix);
  }

  // Forward to Sentry only in production builds. Lazy-import so the
  // SDK isn't pulled into test/dev bundles. Failures here are
  // swallowed silently — a Sentry outage must not turn into a user-
  // visible cascade.
  if (process.env.NODE_ENV === "production") {
    forwardToSentry(prefix, err, extra);
  }
}

async function forwardToSentry(
  prefix: string,
  err: unknown,
  extra: LogContext | undefined,
): Promise<void> {
  try {
    const sentry = await import("@sentry/nextjs");
    // captureException wants an Error; wrap non-Error throws so Sentry's
    // grouping still works (vs being stringified into a single "unknown"
    // issue).
    const errorToCapture =
      err instanceof Error
        ? err
        : new Error(
            err === undefined
              ? prefix
              : `${prefix}: ${typeof err === "string" ? err : JSON.stringify(err)}`,
          );
    sentry.captureException(errorToCapture, {
      tags: { scope: prefix.match(/^\[([^\]]+)\]/)?.[1] ?? "unknown" },
      extra: extra ? { ...extra } : undefined,
    });
  } catch {
    // Intentionally swallowed — see logError header comment.
  }
}

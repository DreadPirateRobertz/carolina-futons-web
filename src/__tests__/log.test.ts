// cfw-u9g1: coverage for src/lib/observability/log.ts. logError is the
// shared structured-error logger introduced to replace ad-hoc
// `console.error("[scope] msg", err)` + Sentry.captureException pairs.
// Pin the contract so a caller migration doesn't accidentally drop the
// flush-on-Vercel guarantee or the scope/op tag pair Sentry dashboards
// query against.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const captureException = vi.fn();
const flush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  flush: (timeoutMs?: number) => flush(timeoutMs),
}));

import { logError, logWarn } from "@/lib/observability/log";

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  captureException.mockReset();
  flush.mockReset().mockResolvedValue(true);
  consoleError.mockClear();
  consoleWarn.mockClear();
});

afterEach(() => {
  consoleError.mockClear();
  consoleWarn.mockClear();
});

describe("logError — happy path", () => {
  it("calls console.error with '[scope] message' prefix + err, captures to Sentry tagged scope+op, then awaits flush", async () => {
    const err = new Error("upstream 502");

    await logError("checkout", "initCheckout failed", err);

    // 1. console.error
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "[checkout] initCheckout failed",
      err,
    );

    // 2. Sentry.captureException — err itself + level=error + scope/op tags
    expect(captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = captureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { level: string }).level).toBe("error");
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "checkout",
      op: "initCheckout failed",
    });

    // 3. Sentry.flush awaited at the documented 2000ms ceiling
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(2000);
  });
});

describe("logError — optional args", () => {
  it("omitting err: synthesises an Error from the prefix string so Sentry still gets a captureable event", async () => {
    await logError("checkout", "unexpected guard branch");

    expect(consoleError).toHaveBeenCalledWith(
      "[checkout] unexpected guard branch",
    );
    expect(consoleError).toHaveBeenCalledTimes(1);

    const [reportedErr, opts] = captureException.mock.calls[0]!;
    expect(reportedErr).toBeInstanceOf(Error);
    expect((reportedErr as Error).message).toBe(
      "[checkout] unexpected guard branch",
    );
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "checkout",
      op: "unexpected guard branch",
    });
  });

  it("passing extra: merges it into Sentry payload AND appends it to console.error for grep-ability", async () => {
    const err = new Error("boom");
    const extra = { cartId: "c-123", origin: "https://cf.com" };

    await logError("checkout", "initCheckout failed", err, extra);

    // console.error gets the extra as the trailing arg.
    expect(consoleError).toHaveBeenCalledWith(
      "[checkout] initCheckout failed",
      err,
      extra,
    );

    // Sentry receives it under `extra`.
    const [, opts] = captureException.mock.calls[0]!;
    expect((opts as { extra: typeof extra }).extra).toEqual(extra);
  });

  it("omitting extra: console.error is called with TWO args (no trailing `undefined`)", async () => {
    const err = new Error("boom");

    await logError("checkout", "msg", err);

    // The first call's arguments should be exactly [prefix, err] — NOT
    // [prefix, err, undefined]. Asserts on .mock.calls length so the
    // optional-extra branch can't drift into appending undefined.
    expect(consoleError.mock.calls[0]).toHaveLength(2);
  });
});

describe("logError — flush contract", () => {
  it("awaits Sentry.flush BEFORE resolving (Vercel serverless guarantee)", async () => {
    // If flush isn't awaited, the request can return + the lambda freezes
    // before Sentry POSTs the event. Force flush to resolve later than
    // captureException and assert ordering.
    const events: string[] = [];
    captureException.mockImplementation(() => events.push("captured"));
    flush.mockImplementation(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      events.push("flushed");
      return true;
    });

    await logError("scope", "msg", new Error("x"));

    expect(events).toEqual(["captured", "flushed"]);
  });

  it("flush rejecting bubbles out (callers that need fail-soft must catch themselves)", async () => {
    flush.mockRejectedValueOnce(new Error("sentry down"));

    await expect(
      logError("scope", "msg", new Error("x")),
    ).rejects.toThrow("sentry down");
  });
});

// cfw-5wm9: logWarn is the warning-level sibling. Same surface as
// logError but emits via console.warn + Sentry level='warning'.
// Pin the contract so Sentry alert routing (which filters on level)
// doesn't accidentally page on-call for rate-limit warnings.
describe("logWarn — happy path", () => {
  it("calls console.warn with '[scope] message' prefix + err, captures to Sentry with level='warning' + scope/op tags, then awaits flush", async () => {
    const err = new Error("rate-limited");

    await logWarn("newsletter", "rate-limited", err);

    // 1. console.warn (NOT console.error)
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      "[newsletter] rate-limited",
      err,
    );
    // console.error MUST NOT fire — Sentry level is the only routing
    // signal, but a stray console.error muddies the log scraper.
    expect(consoleError).not.toHaveBeenCalled();

    // 2. Sentry — same err, but level='warning' for alert routing
    expect(captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = captureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { level: string }).level).toBe("warning");
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "newsletter",
      op: "rate-limited",
    });

    // 3. flush awaited at the same 2000ms ceiling as logError
    expect(flush).toHaveBeenCalledWith(2000);
  });
});

describe("logWarn — optional args + flush contract", () => {
  it("omitting err: synthesises a captureable Error from the prefix", async () => {
    await logWarn("scope", "soft-fail signal");

    expect(consoleWarn).toHaveBeenCalledWith("[scope] soft-fail signal");
    const [reportedErr, opts] = captureException.mock.calls[0]!;
    expect(reportedErr).toBeInstanceOf(Error);
    expect((reportedErr as Error).message).toBe("[scope] soft-fail signal");
    expect((opts as { level: string }).level).toBe("warning");
  });

  it("passing extra: merges it into Sentry payload AND appends to console.warn", async () => {
    const err = new Error("x");
    const extra = { emailHash: "ab12cd34" };

    await logWarn("newsletter", "rate-limited", err, extra);

    expect(consoleWarn).toHaveBeenCalledWith(
      "[newsletter] rate-limited",
      err,
      extra,
    );
    const [, opts] = captureException.mock.calls[0]!;
    expect((opts as { extra: typeof extra }).extra).toEqual(extra);
  });

  it("omitting extra: console.warn is called with TWO args (no trailing `undefined`)", async () => {
    await logWarn("scope", "msg", new Error("x"));
    expect(consoleWarn.mock.calls[0]).toHaveLength(2);
  });

  it("awaits Sentry.flush BEFORE resolving (same Vercel serverless guarantee as logError)", async () => {
    const events: string[] = [];
    captureException.mockImplementation(() => events.push("captured"));
    flush.mockImplementation(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      events.push("flushed");
      return true;
    });

    await logWarn("scope", "msg", new Error("x"));

    expect(events).toEqual(["captured", "flushed"]);
  });
});

describe("logWarn vs logError — level routing contract (load-bearing for Sentry alerts)", () => {
  it("logError emits level='error' AND logWarn emits level='warning' for the SAME message — the two helpers must NOT collapse", async () => {
    await logError("scope", "same message");
    await logWarn("scope", "same message");

    expect(captureException).toHaveBeenCalledTimes(2);
    const [, errOpts] = captureException.mock.calls[0]!;
    const [, warnOpts] = captureException.mock.calls[1]!;
    expect((errOpts as { level: string }).level).toBe("error");
    expect((warnOpts as { level: string }).level).toBe("warning");
    // Both share scope/op so a Sentry filter on tags.scope='scope'
    // surfaces both, but level filters can split them apart for
    // alert routing.
    expect((errOpts as { tags: Record<string, string> }).tags).toEqual(
      (warnOpts as { tags: Record<string, string> }).tags,
    );
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

// cfw-logger: contract tests for the logError standard entry point.
// Pins (1) Error → captureException with stack-preserving payload,
// (2) plain-object → captureMessage with extras, (3) bare message →
// captureMessage with no extras. Console.error is also asserted so a
// future "Sentry-only" refactor doesn't silently drop dev-local
// debugging output.

const captureException = vi.fn();
const captureMessage = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("logError", () => {
  it("captureException + scope-prefixed console.error for an Error payload", async () => {
    const err = new Error("fetch failed");
    const { logError } = await import("@/lib/logger");

    logError("notify-me", "Velo upstream call rejected", err);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[notify-me] Velo upstream call rejected",
      err,
    );
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(err, {
      tags: { source: "notify-me" },
      extra: { message: "Velo upstream call rejected" },
    });
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("captureMessage with spread extras when payload is a plain object", async () => {
    const { logError } = await import("@/lib/logger");

    logError("notify-me", "Velo responded with non-ok status", {
      status: 502,
      productId: "kingston-oak",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[notify-me] Velo responded with non-ok status",
      { status: 502, productId: "kingston-oak" },
    );
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      "Velo responded with non-ok status",
      {
        level: "error",
        tags: { source: "notify-me" },
        // Fields are spread onto `extra` (not nested under `meta`) so
        // each one is a top-level attribute in the Sentry UI.
        extra: { status: 502, productId: "kingston-oak" },
      },
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it("captureMessage with undefined extras when no payload is given (config-missing path)", async () => {
    const { logError } = await import("@/lib/logger");

    logError("notify-me", "WIX_VELO_SITE_URL not set");

    // Console line has NO trailing payload arg — no `undefined` reads.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[notify-me] WIX_VELO_SITE_URL not set",
    );
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      "WIX_VELO_SITE_URL not set",
      {
        level: "error",
        tags: { source: "notify-me" },
        extra: undefined,
      },
    );
    expect(captureException).not.toHaveBeenCalled();
  });
});

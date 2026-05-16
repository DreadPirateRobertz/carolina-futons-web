// cfw-1ol0: contract tests for the general-purpose logError helper.
// Covers the three load-bearing behaviours:
//   1. Console line shape — "[source] op failed" prefix + { message,
//      ...extra } object so logs grep cleanly across modules.
//   2. Sentry routing — captureException with level=error and
//      { source, op } tags so the SDK groups events per call site.
//   3. Awaited flush — load-bearing on Vercel; without it captureException
//      queues the event and the function freezes before the HTTP POST.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCaptureException = vi.fn();
const mockFlush = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  flush: (...args: unknown[]) => mockFlush(...args),
}));

import { logError } from "@/lib/logging/log-error";

describe("logError (cfw-1ol0)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCaptureException.mockReset();
    mockFlush.mockReset();
    mockFlush.mockResolvedValue(true);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("writes a '[source] op failed' line to console.error with merged extra context", async () => {
    const err = new Error("boom");
    await logError("audit-log", "record", err, { entryId: "abc-123" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[audit-log] record failed",
      expect.objectContaining({ message: "boom", entryId: "abc-123" }),
    );
  });

  it("routes to Sentry.captureException at level=error with { source, op } tags", async () => {
    const err = new Error("boom");
    await logError("newsletter", "subscribe", err, { hashedEmail: "h:abcd" });

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        level: "error",
        tags: { source: "newsletter", op: "subscribe" },
        extra: expect.objectContaining({
          message: "boom",
          hashedEmail: "h:abcd",
        }),
      }),
    );
  });

  it("awaits Sentry.flush(2000) before resolving (serverless drop-event guard)", async () => {
    // If logError doesn't await, the promise resolves before flush is
    // called — assert flush is called within the awaited call, with the
    // 2 s ceiling.
    await logError("admin", "writeAudit", new Error("downstream timeout"));
    expect(mockFlush).toHaveBeenCalledTimes(1);
    expect(mockFlush).toHaveBeenCalledWith(2000);
  });

  // ── defensive cases ───────────────────────────────────────────────

  it("stringifies non-Error throwables for the console line and still passes the raw value to Sentry", async () => {
    await logError("audit-log", "record", "not-an-Error-instance");

    expect(errorSpy).toHaveBeenCalledWith(
      "[audit-log] record failed",
      expect.objectContaining({ message: "not-an-Error-instance" }),
    );
    // Sentry SDK can extract a stack from native errors; pass the
    // original through so it can decide.
    expect(mockCaptureException).toHaveBeenCalledWith(
      "not-an-Error-instance",
      expect.anything(),
    );
  });

  it("does NOT throw to the caller when Sentry.flush rejects", async () => {
    mockFlush.mockRejectedValueOnce(new Error("sentry transport down"));
    await expect(
      logError("audit-log", "record", new Error("boom")),
    ).resolves.toBeUndefined();
  });
});

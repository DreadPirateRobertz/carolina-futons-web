import { describe, it, expect, vi, beforeEach } from "vitest";

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@sentry/nextjs", () => sentryMock);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("logError", () => {
  it("captures to Sentry with source/op tags and awaits flush (serverless-safe)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logError } = await import("@/lib/log");
    const err = new Error("boom");
    await logError("checkout", "initCheckout", err);

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    const [captured, opts] = sentryMock.captureException.mock.calls[0];
    expect(captured).toBe(err);
    expect(opts).toMatchObject({
      level: "error",
      tags: { source: "checkout", op: "initCheckout" },
      extra: { message: "boom" },
    });
    expect(sentryMock.flush).toHaveBeenCalledWith(2000);
  });

  it("logs to console.error with the [source] prefix and the op", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logError } = await import("@/lib/log");
    await logError("audit-log", "items.save", new Error("down"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("[audit-log]");
    expect(spy.mock.calls[0][0]).toContain("items.save");
  });

  it("stringifies non-Error throws into the message field", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logError } = await import("@/lib/log");
    await logError("checkout", "initCheckout", "plain string boom");

    const [, opts] = sentryMock.captureException.mock.calls[0];
    expect(opts).toMatchObject({
      extra: { message: "plain string boom" },
    });
  });
});

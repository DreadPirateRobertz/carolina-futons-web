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

describe("isWixSdkError", () => {
  it("returns true for an error with a string code (Wix SDK shape)", async () => {
    const { isWixSdkError } = await import("@/lib/wix/errors");
    expect(isWixSdkError(Object.assign(new Error("boom"), { code: "RATE_LIMIT" }))).toBe(true);
  });

  it("returns true for an error with details.applicationError", async () => {
    const { isWixSdkError } = await import("@/lib/wix/errors");
    expect(isWixSdkError({ details: { applicationError: { code: "X" } } })).toBe(true);
  });

  it("returns true for an error with response.status (HTTP shape)", async () => {
    const { isWixSdkError } = await import("@/lib/wix/errors");
    expect(isWixSdkError({ response: { status: 500 } })).toBe(true);
  });

  it("returns false for a plain Error (not Wix SDK)", async () => {
    const { isWixSdkError } = await import("@/lib/wix/errors");
    expect(isWixSdkError(new Error("just broken"))).toBe(false);
  });

  it("returns false for null / undefined / primitives", async () => {
    const { isWixSdkError } = await import("@/lib/wix/errors");
    expect(isWixSdkError(null)).toBe(false);
    expect(isWixSdkError(undefined)).toBe(false);
    expect(isWixSdkError("string error")).toBe(false);
    expect(isWixSdkError(42)).toBe(false);
  });
});

describe("toReaderError", () => {
  it("tags Wix-shaped errors as 'wix_sdk'", async () => {
    const { toReaderError } = await import("@/lib/wix/errors");
    expect(toReaderError({ code: "RATE_LIMIT" })).toBe("wix_sdk");
  });

  it("tags everything else as 'unexpected'", async () => {
    const { toReaderError } = await import("@/lib/wix/errors");
    expect(toReaderError(new Error("unrelated"))).toBe("unexpected");
  });
});

describe("logWixFailure", () => {
  it("captures to Sentry with source/op tags and awaits flush (serverless-safe)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logWixFailure } = await import("@/lib/wix/errors");
    const err = Object.assign(new Error("rate limited"), { code: "RATE_LIMIT" });
    await logWixFailure("plp", "queryProducts", err);

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    const [captured, opts] = sentryMock.captureException.mock.calls[0];
    expect(captured).toBe(err);
    expect(opts).toMatchObject({
      level: "warning",
      tags: { source: "plp", op: "queryProducts", kind: "wix-sdk" },
    });
    expect(sentryMock.flush).toHaveBeenCalledWith(2000);
  });

  it("uses level='error' + kind='unexpected' for non-Wix errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logWixFailure } = await import("@/lib/wix/errors");
    await logWixFailure("cross-sell", "find", new Error("programmer bug"));

    const [, opts] = sentryMock.captureException.mock.calls[0];
    expect(opts).toMatchObject({
      level: "error",
      tags: { source: "cross-sell", op: "find", kind: "unexpected" },
    });
  });

  it("logs to console.error with the source tag in the prefix", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logWixFailure } = await import("@/lib/wix/errors");
    await logWixFailure("products", "getProductBySlug(foo)", new Error("down"));
    expect(spy.mock.calls[0][0]).toContain("[products]");
    expect(spy.mock.calls[0][0]).toContain("getProductBySlug(foo)");
  });

  it("attaches Sentry extras with code + httpStatus pulled from the Wix error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logWixFailure } = await import("@/lib/wix/errors");
    const err = Object.assign(new Error("boom"), {
      code: "RATE_LIMIT",
      response: { status: 429 },
    });
    await logWixFailure("plp", "queryProducts", err);

    const [, opts] = sentryMock.captureException.mock.calls[0];
    expect(opts).toMatchObject({
      extra: { code: "RATE_LIMIT", httpStatus: 429, message: "boom" },
    });
  });

  it("falls back to details.applicationError.code when top-level code is absent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { logWixFailure } = await import("@/lib/wix/errors");
    // No top-level .code — only the nested applicationError code.
    const err = {
      message: "app error",
      details: { applicationError: { code: "PRODUCT_NOT_FOUND" } },
    };
    await logWixFailure("products", "getProductBySlug(x)", err);

    const [, opts] = sentryMock.captureException.mock.calls[0];
    expect(opts).toMatchObject({
      extra: { code: "PRODUCT_NOT_FOUND" },
    });
  });
});

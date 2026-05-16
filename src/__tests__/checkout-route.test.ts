import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const initCheckoutMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("@/lib/wix/checkout", () => ({
  initCheckout: initCheckoutMock,
}));

vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

describe("GET /checkout route", () => {
  beforeEach(() => {
    initCheckoutMock.mockReset();
    logErrorMock.mockReset();
  });

  it("redirects to the Wix fullUrl on success", async () => {
    initCheckoutMock.mockResolvedValue({
      checkoutId: "chk-1",
      fullUrl: "https://wix.com/checkout/pay/chk-1",
    });
    const { GET } = await import("@/app/checkout/route");
    const req = new NextRequest("https://carolinafutons.com/checkout");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://wix.com/checkout/pay/chk-1");
  });

  it("passes correct callback URLs to initCheckout", async () => {
    initCheckoutMock.mockResolvedValue({
      checkoutId: "chk-1",
      fullUrl: "https://wix.com/checkout/pay/chk-1",
    });
    const { GET } = await import("@/app/checkout/route");
    await GET(new NextRequest("https://carolinafutons.com/checkout"));
    const [callbacks] = initCheckoutMock.mock.calls[0]!;
    expect(callbacks.thankYouPageUrl).toContain("/order-confirmation");
    expect(callbacks.cartPageUrl).toContain("/cart");
  });

  it("redirects to /cart?checkout_error=1 when initCheckout throws", async () => {
    initCheckoutMock.mockRejectedValue(new Error("Wix timeout"));
    const { GET } = await import("@/app/checkout/route");
    const req = new NextRequest("https://carolinafutons.com/checkout");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/cart");
    expect(res.headers.get("location")).toContain("checkout_error=1");
  });
});

// cfw-logger migration: console.error → logError. Pin the contract
// so the catch branch keeps emitting observability events with the
// "checkout" scope tag and the stack-preserving Error payload.
describe("GET /checkout route — logError on failure", () => {
  beforeEach(() => {
    initCheckoutMock.mockReset();
    logErrorMock.mockReset();
  });

  it("calls logError when initCheckout throws", async () => {
    initCheckoutMock.mockRejectedValue(new Error("Wix down"));
    const { GET } = await import("@/app/checkout/route");
    await GET(new NextRequest("https://carolinafutons.com/checkout"));
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='checkout' and message='initCheckout failed'", async () => {
    initCheckoutMock.mockRejectedValue(new Error("Wix down"));
    const { GET } = await import("@/app/checkout/route");
    await GET(new NextRequest("https://carolinafutons.com/checkout"));
    expect(logErrorMock).toHaveBeenCalledWith(
      "checkout",
      "initCheckout failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError (preserves stack)", async () => {
    const err = new Error("Wix down");
    initCheckoutMock.mockRejectedValue(err);
    const { GET } = await import("@/app/checkout/route");
    await GET(new NextRequest("https://carolinafutons.com/checkout"));
    const [, , payload] = logErrorMock.mock.calls[0]!;
    // Same instance — logError's Error branch will route this through
    // Sentry.captureException to preserve the stack trace.
    expect(payload).toBe(err);
  });
});

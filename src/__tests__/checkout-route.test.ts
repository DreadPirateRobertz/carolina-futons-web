import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const initCheckoutMock = vi.fn();

vi.mock("@/lib/wix/checkout", () => ({
  initCheckout: initCheckoutMock,
}));

describe("GET /checkout route", () => {
  beforeEach(() => {
    initCheckoutMock.mockReset();
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

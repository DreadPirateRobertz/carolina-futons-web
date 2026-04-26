import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const initCheckoutMock = vi.fn();
const logWixFailureMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/wix/checkout", () => ({
  initCheckout: initCheckoutMock,
}));

vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: logWixFailureMock,
}));

// Hoist module import so the mock above is applied before the route module
// loads. vi.resetModules() in beforeEach ensures each test gets a fresh import.
let GET: (req: NextRequest) => Promise<Response>;
beforeEach(async () => {
  vi.resetModules();
  initCheckoutMock.mockReset();
  logWixFailureMock.mockReset();
  logWixFailureMock.mockResolvedValue(undefined);
  ({ GET } = await import("@/app/checkout/route"));
});

describe("GET /checkout route", () => {
  it("redirects to the Wix fullUrl on success", async () => {
    initCheckoutMock.mockResolvedValue({
      checkoutId: "chk-1",
      fullUrl: "https://wix.com/checkout/pay/chk-1",
    });
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
    await GET(new NextRequest("https://carolinafutons.com/checkout"));
    const [callbacks] = initCheckoutMock.mock.calls[0]!;
    expect(callbacks.thankYouPageUrl).toContain("/order-confirmation");
    expect(callbacks.cartPageUrl).toContain("/cart");
    expect(callbacks.postFlowUrl).toContain("/");
  });

  it("redirects to /cart?checkout_error=1 when initCheckout throws", async () => {
    initCheckoutMock.mockRejectedValue(new Error("Wix timeout"));
    const req = new NextRequest("https://carolinafutons.com/checkout");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/cart");
    expect(res.headers.get("location")).toContain("checkout_error=1");
  });
});

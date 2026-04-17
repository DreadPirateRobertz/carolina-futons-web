import { describe, it, expect, vi, beforeEach } from "vitest";

const initCheckout = vi.fn();

vi.mock("@/lib/wix/checkout", () => ({
  initCheckout: (...args: unknown[]) => initCheckout(...args),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (key: string) => {
      if (key === "host") return "example.com";
      if (key === "x-forwarded-proto") return "https";
      return null;
    },
  }),
}));

describe("startCheckoutAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("builds callbacks from request headers and returns fullUrl", async () => {
    initCheckout.mockResolvedValueOnce({
      checkoutId: "chk_1",
      fullUrl: "https://wix-checkout/redirect",
      redirectSessionId: "rs_1",
    });
    const { startCheckoutAction } = await import("@/app/actions/checkout");
    const result = await startCheckoutAction();
    expect(result).toEqual({
      ok: true,
      fullUrl: "https://wix-checkout/redirect",
      checkoutId: "chk_1",
    });
    expect(initCheckout).toHaveBeenCalledWith({
      thankYouPageUrl: "https://example.com/order-confirmation",
      cartPageUrl: "https://example.com/cart",
      postFlowUrl: "https://example.com/",
    });
  });

  it("prefers NEXT_PUBLIC_SITE_URL over request headers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cfutons.com/");
    initCheckout.mockResolvedValueOnce({
      checkoutId: "chk_2",
      fullUrl: "https://wix-checkout/redirect2",
    });
    const { startCheckoutAction } = await import("@/app/actions/checkout");
    await startCheckoutAction();
    expect(initCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        thankYouPageUrl: "https://cfutons.com/order-confirmation",
      }),
    );
  });

  it("returns error on thrown Error", async () => {
    initCheckout.mockRejectedValueOnce(new Error("checkout API down"));
    const { startCheckoutAction } = await import("@/app/actions/checkout");
    const result = await startCheckoutAction();
    expect(result).toEqual({ ok: false, error: "checkout API down" });
  });

  it("returns generic error on non-Error throw", async () => {
    initCheckout.mockRejectedValueOnce("oops");
    const { startCheckoutAction } = await import("@/app/actions/checkout");
    const result = await startCheckoutAction();
    expect(result).toEqual({ ok: false, error: "Unknown checkout error" });
  });
});

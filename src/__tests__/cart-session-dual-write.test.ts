import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  buildDualWritePayload,
  syncCartSession,
} from "@/lib/wix/cart-session-dual-write";
import type { WixCart } from "@/lib/wix/cart";

// cf-cart-session-dual-write: the helper must be a no-op on bad inputs and
// must NEVER throw — the cart Server Actions invoke it without awaiting and
// rely on this contract to keep the user-facing response decoupled from any
// Velo-side failure.

function fakeCart(overrides: Partial<Record<string, unknown>> = {}): WixCart {
  return {
    _id: "cart-1",
    lineItems: [
      {
        catalogReference: { catalogItemId: "prod-A" },
        quantity: 2,
      },
      {
        catalogReference: {
          catalogItemId: "prod-B",
          options: { variantId: "var-B" },
        },
        quantity: 1,
      },
    ],
    ...overrides,
  } as unknown as WixCart;
}

describe("buildDualWritePayload (cf-cart-session-dual-write)", () => {
  it("maps cart line items to {productId, quantity, variantId?} payload", () => {
    const payload = buildDualWritePayload(fakeCart());
    expect(payload).toEqual({
      cartId: "cart-1",
      items: [
        { productId: "prod-A", quantity: 2 },
        { productId: "prod-B", variantId: "var-B", quantity: 1 },
      ],
    });
  });

  it("returns null when cart is null/undefined", () => {
    expect(buildDualWritePayload(null)).toBeNull();
    expect(buildDualWritePayload(undefined)).toBeNull();
  });

  it("returns null when cart has no _id (no key for the mobile bridge)", () => {
    expect(
      buildDualWritePayload(fakeCart({ _id: undefined }) as unknown as WixCart),
    ).toBeNull();
    expect(
      buildDualWritePayload(fakeCart({ _id: "" }) as unknown as WixCart),
    ).toBeNull();
  });

  it("filters out line items missing productId or with non-positive quantity", () => {
    const cart = fakeCart({
      lineItems: [
        { catalogReference: {}, quantity: 5 }, // no catalogItemId
        { catalogReference: { catalogItemId: "prod-A" }, quantity: 0 }, // zero qty
        { catalogReference: { catalogItemId: "prod-B" }, quantity: -3 }, // negative
        { catalogReference: { catalogItemId: "prod-C" }, quantity: 4 }, // valid
      ],
    });
    const payload = buildDualWritePayload(cart);
    expect(payload?.items).toEqual([{ productId: "prod-C", quantity: 4 }]);
  });

  it("treats empty lineItems as a valid empty-cart payload", () => {
    const payload = buildDualWritePayload(fakeCart({ lineItems: [] }));
    expect(payload).toEqual({ cartId: "cart-1", items: [] });
  });
});

describe("syncCartSession (cf-cart-session-dual-write)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.WIX_VELO_SITE_URL;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    process.env.WIX_VELO_SITE_URL = "https://www.example.com";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.WIX_VELO_SITE_URL;
    else process.env.WIX_VELO_SITE_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it("POSTs to /_functions/cartSession with the dual-write payload", async () => {
    syncCartSession(fakeCart());
    // Fire-and-forget — give the microtask queue a tick to dispatch.
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://www.example.com/_functions/cartSession");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      cartId: "cart-1",
      items: [
        { productId: "prod-A", quantity: 2 },
        { productId: "prod-B", variantId: "var-B", quantity: 1 },
      ],
    });
  });

  it("strips a trailing slash on WIX_VELO_SITE_URL", async () => {
    process.env.WIX_VELO_SITE_URL = "https://www.example.com/";
    syncCartSession(fakeCart());
    await Promise.resolve();
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://www.example.com/_functions/cartSession");
  });

  it("is a no-op when WIX_VELO_SITE_URL is unset", () => {
    delete process.env.WIX_VELO_SITE_URL;
    syncCartSession(fakeCart());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when buildDualWritePayload returns null (no _id)", () => {
    syncCartSession(fakeCart({ _id: undefined }) as unknown as WixCart);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw when the Velo POST rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy.mockRejectedValueOnce(new Error("velo-down"));
    expect(() => syncCartSession(fakeCart())).not.toThrow();
    // Let the microtask queue run so the .catch handler fires.
    await new Promise((r) => setTimeout(r, 0));
    expect(errSpy).toHaveBeenCalledOnce();
    expect(errSpy.mock.calls[0]![0]).toContain("[cart-session-dual-write]");
    errSpy.mockRestore();
  });
});

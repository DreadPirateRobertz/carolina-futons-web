import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const addToCart = vi.fn();
const removeFromCart = vi.fn();
const updateLineItemQuantity = vi.fn();
const getCurrentCart = vi.fn();
const wixCartToLines = vi.fn();
const applyCoupon = vi.fn();
const removeCoupon = vi.fn();
// cf-8ys6: spy that the sibling catches each call logWixFailure with the
// correct ("cart", actionName, err) tuple. Mocked to no-op so the real
// `@sentry/nextjs` import + `Sentry.flush(2000)` don't fire under jsdom.
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/wix/cart", () => ({
  addToCart: (...args: unknown[]) => addToCart(...args),
  removeFromCart: (...args: unknown[]) => removeFromCart(...args),
  updateLineItemQuantity: (...args: unknown[]) =>
    updateLineItemQuantity(...args),
  getCurrentCart: (...args: unknown[]) => getCurrentCart(...args),
  wixCartToLines: (...args: unknown[]) => wixCartToLines(...args),
  applyCoupon: (...args: unknown[]) => applyCoupon(...args),
  removeCoupon: (...args: unknown[]) => removeCoupon(...args),
  // cf-56ue: extractAppliedCoupon is called by applyCouponAction +
  // hydrateCartAction; return undefined so existing tests that assert
  // { ok: true, cart } / { ok: true, lines } stay unaffected.
  extractAppliedCoupon: () => undefined,
}));

vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

describe("cart server actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("addItemAction", () => {
    it("rejects missing productId", async () => {
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "", quantity: 1 });
      expect(result).toEqual({ ok: false, error: "Missing productId" });
      expect(addToCart).not.toHaveBeenCalled();
    });

    it("rejects non-positive quantity", async () => {
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 0 });
      expect(result.ok).toBe(false);
      expect(addToCart).not.toHaveBeenCalled();
    });

    it("rejects non-integer quantity", async () => {
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 1.5 });
      expect(result.ok).toBe(false);
    });

    it("forwards to addToCart and returns cart on success", async () => {
      addToCart.mockResolvedValueOnce({ _id: "cart1", lineItems: [] });
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({
        productId: "p1",
        quantity: 2,
        variantId: "v1",
      });
      expect(result).toEqual({
        ok: true,
        cart: { _id: "cart1", lineItems: [] },
      });
      expect(addToCart).toHaveBeenCalledWith([
        { productId: "p1", quantity: 2, variantId: "v1" },
      ]);
    });

    it("returns error message on thrown Error", async () => {
      addToCart.mockRejectedValueOnce(new Error("network down"));
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 1 });
      expect(result).toEqual({ ok: false, error: "network down" });
    });

    it("returns generic error for non-Error throw", async () => {
      addToCart.mockRejectedValueOnce("string rejection");
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 1 });
      expect(result).toEqual({ ok: false, error: "Unknown cart error" });
    });

    // cf-h78k: addItem was the load-bearing reference impl in cf-f9o1 but
    // its catch never adopted logWixFailure — only the sibling
    // remove/update did. cf-8ys6 left it alone; this is the cleanup.
    it("Sentry-tags addToCart failure via logWixFailure", async () => {
      const err = new Error("Wix add failed");
      addToCart.mockRejectedValueOnce(err);
      const { addItemAction } = await import("@/app/actions/cart");
      await addItemAction({ productId: "p1", quantity: 1 });
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "addItemAction",
        err,
      );
    });
  });

  describe("removeItemAction", () => {
    it("rejects missing lineItemId", async () => {
      const { removeItemAction } = await import("@/app/actions/cart");
      const result = await removeItemAction("");
      expect(result.ok).toBe(false);
      expect(removeFromCart).not.toHaveBeenCalled();
      // Input-validation rejection isn't a Wix failure — no Sentry tag.
      expect(logWixFailure).not.toHaveBeenCalled();
    });

    it("forwards to removeFromCart", async () => {
      removeFromCart.mockResolvedValueOnce({ _id: "cart1", lineItems: [] });
      const { removeItemAction } = await import("@/app/actions/cart");
      const result = await removeItemAction("li1");
      expect(result.ok).toBe(true);
      expect(removeFromCart).toHaveBeenCalledWith(["li1"]);
    });

    // cf-8ys6: Sentry-tag sibling catch — the missing log on this surface
    // is what made a Wix outage during cart-row removal appear as a
    // generic "couldn't remove" toast with no breadcrumb.
    it("Sentry-tags removeFromCart failure via logWixFailure", async () => {
      const err = new Error("Wix down");
      removeFromCart.mockRejectedValueOnce(err);
      const { removeItemAction } = await import("@/app/actions/cart");
      const result = await removeItemAction("li1");
      expect(result).toEqual({ ok: false, error: "Wix down" });
      expect(logWixFailure).toHaveBeenCalledWith("cart", "removeItemAction", err);
    });
  });

  describe("updateQuantityAction", () => {
    it("rejects invalid quantity", async () => {
      const { updateQuantityAction } = await import("@/app/actions/cart");
      const result = await updateQuantityAction("li1", 0);
      expect(result.ok).toBe(false);
      expect(updateLineItemQuantity).not.toHaveBeenCalled();
    });

    it("forwards to updateLineItemQuantity", async () => {
      updateLineItemQuantity.mockResolvedValueOnce({
        _id: "cart1",
        lineItems: [],
      });
      const { updateQuantityAction } = await import("@/app/actions/cart");
      const result = await updateQuantityAction("li1", 3);
      expect(result.ok).toBe(true);
      expect(updateLineItemQuantity).toHaveBeenCalledWith("li1", 3);
    });

    // cf-8ys6: Sentry-tag sibling catch.
    it("Sentry-tags updateLineItemQuantity failure via logWixFailure", async () => {
      const err = new Error("Stock conflict");
      updateLineItemQuantity.mockRejectedValueOnce(err);
      const { updateQuantityAction } = await import("@/app/actions/cart");
      const result = await updateQuantityAction("li1", 3);
      expect(result).toEqual({ ok: false, error: "Stock conflict" });
      expect(logWixFailure).toHaveBeenCalledWith("cart", "updateQuantityAction", err);
    });
  });

  describe("getCartAction", () => {
    it("returns cart when getCurrentCart resolves", async () => {
      getCurrentCart.mockResolvedValueOnce(null);
      const { getCartAction } = await import("@/app/actions/cart");
      const result = await getCartAction();
      expect(result).toEqual({ ok: true, cart: null });
    });

    it("returns error on throw", async () => {
      const err = new Error("boom");
      getCurrentCart.mockRejectedValueOnce(err);
      const { getCartAction } = await import("@/app/actions/cart");
      const result = await getCartAction();
      expect(result).toEqual({ ok: false, error: "boom" });
      // cf-8ys6: Sentry-tag sibling catch.
      expect(logWixFailure).toHaveBeenCalledWith("cart", "getCartAction", err);
    });
  });

  // cf-snil (cf-wsrr.F2): in-cart coupon entry. Wix SDK exposes
  // currentCart.updateCurrentCart with appliedDiscounts[].coupon.code.
  // Server-action wrapper surfaces it to CartDrawer + /cart.
  describe("applyCouponAction", () => {
    it("rejects empty / whitespace code without calling Wix", async () => {
      const { applyCouponAction } = await import("@/app/actions/cart");
      expect((await applyCouponAction("")).ok).toBe(false);
      expect((await applyCouponAction("   ")).ok).toBe(false);
      expect(applyCoupon).not.toHaveBeenCalled();
    });

    it("trims the code before forwarding to the Wix client", async () => {
      applyCoupon.mockResolvedValueOnce({ _id: "cart1", lineItems: [] });
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("  SUMMER15  ");
      expect(result.ok).toBe(true);
      expect(applyCoupon).toHaveBeenCalledWith("SUMMER15");
    });

    it("returns the updated cart on success", async () => {
      const fakeCart = { _id: "cart1", lineItems: [], appliedDiscounts: [] };
      applyCoupon.mockResolvedValueOnce(fakeCart);
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("SUMMER15");
      expect(result).toEqual({ ok: true, cart: fakeCart });
    });

    it("surfaces invalid-code error message verbatim", async () => {
      applyCoupon.mockRejectedValueOnce(new Error("Coupon code not valid"));
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("BOGUS");
      expect(result).toEqual({ ok: false, error: "Coupon code not valid" });
    });

    it("returns generic error for non-Error rejection (defense in depth)", async () => {
      applyCoupon.mockRejectedValueOnce("string rejection");
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("ANY");
      expect(result).toEqual({ ok: false, error: "Unknown cart error" });
    });

    // cf-h78k: catch was missing logWixFailure post-cf-8ys6. Coupon
    // failures (invalid code, Wix outage, expired session) were
    // surfaced to the user but left no Sentry breadcrumb to triage.
    it("Sentry-tags applyCoupon failure via logWixFailure", async () => {
      const err = new Error("Coupon service down");
      applyCoupon.mockRejectedValueOnce(err);
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("SUMMER15");
      expect(result).toEqual({ ok: false, error: "Coupon service down" });
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "applyCouponAction",
        err,
      );
    });

    it("does NOT Sentry-tag empty-code input validation (not a Wix failure)", async () => {
      const { applyCouponAction } = await import("@/app/actions/cart");
      await applyCouponAction("");
      // Local input rejection shouldn't pollute the Sentry stream — the
      // user is correcting a typo, not hitting a backend outage.
      expect(logWixFailure).not.toHaveBeenCalled();
    });
  });

  describe("removeCouponAction", () => {
    it("forwards to removeCoupon and returns the updated cart", async () => {
      const fakeCart = { _id: "cart1", lineItems: [], appliedDiscounts: [] };
      removeCoupon.mockResolvedValueOnce(fakeCart);
      const { removeCouponAction } = await import("@/app/actions/cart");
      const result = await removeCouponAction();
      expect(result).toEqual({ ok: true, cart: fakeCart });
      expect(removeCoupon).toHaveBeenCalledTimes(1);
    });

    it("returns error result on Wix throw", async () => {
      removeCoupon.mockRejectedValueOnce(new Error("network down"));
      const { removeCouponAction } = await import("@/app/actions/cart");
      const result = await removeCouponAction();
      expect(result).toEqual({ ok: false, error: "network down" });
    });

    // cf-h78k: pair to the applyCouponAction Sentry tag — same rationale.
    it("Sentry-tags removeCoupon failure via logWixFailure", async () => {
      const err = new Error("network down");
      removeCoupon.mockRejectedValueOnce(err);
      const { removeCouponAction } = await import("@/app/actions/cart");
      await removeCouponAction();
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "removeCouponAction",
        err,
      );
    });
  });

  describe("hydrateCartAction", () => {
    const mockLine = {
      id: "p1",
      productId: "p1",
      productName: "Daisy Futon",
      quantity: 1,
      unitPriceCents: 79900,
      formattedUnitPrice: "$799.00",
    };

    it("returns mapped lines when cart exists", async () => {
      const fakeCart = { _id: "cart1", lineItems: [{}] };
      getCurrentCart.mockResolvedValueOnce(fakeCart);
      wixCartToLines.mockReturnValueOnce([mockLine]);
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result).toEqual({ ok: true, lines: [mockLine] });
      expect(wixCartToLines).toHaveBeenCalledWith(fakeCart);
    });

    it("returns empty lines when getCurrentCart returns null (no cart yet)", async () => {
      getCurrentCart.mockResolvedValueOnce(null);
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result).toEqual({ ok: true, lines: [] });
      expect(wixCartToLines).not.toHaveBeenCalled();
    });

    it("returns error result when getCurrentCart throws", async () => {
      const err = new Error("Wix down");
      getCurrentCart.mockRejectedValueOnce(err);
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result).toEqual({ ok: false, error: "Wix down" });
      // cf-8ys6: Sentry-tag sibling catch — the bead spec's "worst
      // offender" — an empty /cart page on hydrate failure previously
      // landed with no error breadcrumb at all.
      expect(logWixFailure).toHaveBeenCalledWith("cart", "hydrateCartAction", err);
    });
  });
});

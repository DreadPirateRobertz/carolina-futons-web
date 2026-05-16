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

// cf-f3zo: extractAppliedCoupon is the live (non-mocked) helper — keeping
// it real lets these tests assert end-to-end behavior from "Wix cart
// shape with appliedDiscounts" through to the action's returned
// appliedCoupon field, instead of stubbing the parser itself. The unit
// tests for the helper live in src/__tests__/extract-applied-coupon.test.ts.
const realCart = await vi.importActual<typeof import("@/lib/wix/cart")>(
  "@/lib/wix/cart",
);

vi.mock("@/lib/wix/cart", () => ({
  addToCart: (...args: unknown[]) => addToCart(...args),
  removeFromCart: (...args: unknown[]) => removeFromCart(...args),
  updateLineItemQuantity: (...args: unknown[]) =>
    updateLineItemQuantity(...args),
  getCurrentCart: (...args: unknown[]) => getCurrentCart(...args),
  wixCartToLines: (...args: unknown[]) => wixCartToLines(...args),
  applyCoupon: (...args: unknown[]) => applyCoupon(...args),
  removeCoupon: (...args: unknown[]) => removeCoupon(...args),
  extractAppliedCoupon: realCart.extractAppliedCoupon,
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

    // cf-f3zo (cf-5qv7.fu1): pin that applyCouponAction extracts
    // appliedCoupon from the Wix cart's appliedDiscounts[0] and returns
    // it on the success shape. Without this, CartCouponEntry's
    // setAppliedCoupon dispatch never fires (the field would be
    // undefined), and the CartDrawer discount line never renders.
    it("returns appliedCoupon when the Wix cart carries one (cf-f3zo)", async () => {
      const fakeCart = {
        _id: "cart1",
        lineItems: [],
        appliedDiscounts: [
          {
            coupon: { code: "SUMMER15", amount: { amount: "15.00" } },
          },
        ],
      };
      applyCoupon.mockResolvedValueOnce(fakeCart);
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("SUMMER15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appliedCoupon).toEqual({
          code: "SUMMER15",
          discountCents: 1500,
        });
      }
    });

    it("omits appliedCoupon when the Wix cart has no applied discounts (cf-f3zo)", async () => {
      const fakeCart = { _id: "cart1", lineItems: [], appliedDiscounts: [] };
      applyCoupon.mockResolvedValueOnce(fakeCart);
      const { applyCouponAction } = await import("@/app/actions/cart");
      const result = await applyCouponAction("SUMMER15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appliedCoupon).toBeUndefined();
      }
    });

    // cf-no2d (cf-7utd.fu1): in fixture mode (NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1)
    // the cart action MUST short-circuit before touching Wix. Without this,
    // applyCoupon() inside the action calls getWixClient() which throws
    // because WIX_CLIENT_ID_HEADLESS is unset in fixture env. Result: cart-
    // flow e2e sees errorState rather than appliedState, masking real
    // regressions behind the `.or(errorState)` tolerance.
    //
    // Mirrors the existing addItemAction fixture short-circuit at
    // src/app/actions/cart.ts:39 (cf-f9o1 reference impl).
    it("short-circuits in fixture mode without calling Wix (cf-no2d)", async () => {
      const prev = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
      process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = "1";
      try {
        const { applyCouponAction } = await import("@/app/actions/cart");
        const result = await applyCouponAction("TESTCODE");
        expect(result).toEqual({ ok: true, cart: null });
        expect(applyCoupon).not.toHaveBeenCalled();
        expect(logWixFailure).not.toHaveBeenCalled();
      } finally {
        if (prev === undefined) {
          delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
        } else {
          process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = prev;
        }
      }
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

    // cf-no2d (cf-7utd.fu1): paired fixture short-circuit (see applyCouponAction).
    it("short-circuits in fixture mode without calling Wix (cf-no2d)", async () => {
      const prev = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
      process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = "1";
      try {
        const { removeCouponAction } = await import("@/app/actions/cart");
        const result = await removeCouponAction();
        expect(result).toEqual({ ok: true, cart: null });
        expect(removeCoupon).not.toHaveBeenCalled();
        expect(logWixFailure).not.toHaveBeenCalled();
      } finally {
        if (prev === undefined) {
          delete process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS;
        } else {
          process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = prev;
        }
      }
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

    // cf-f3zo: pin appliedCoupon extraction on the hydrate path so cart
    // state restores its applied coupon on page reload. Without this,
    // CartHydrator would re-hydrate lines but drop the coupon, making
    // the CartDrawer's discount line disappear after a refresh.
    it("returns appliedCoupon when the server cart carries one (cf-f3zo)", async () => {
      const mockLine = {
        id: "p1",
        productId: "p1",
        productName: "Daisy Futon",
        quantity: 1,
        unitPriceCents: 79900,
        formattedUnitPrice: "$799.00",
      };
      const fakeCart = {
        _id: "cart1",
        lineItems: [{}],
        appliedDiscounts: [
          {
            coupon: { code: "WELCOME", amount: { amount: "5.00" } },
          },
        ],
      };
      getCurrentCart.mockResolvedValueOnce(fakeCart);
      wixCartToLines.mockReturnValueOnce([mockLine]);
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appliedCoupon).toEqual({
          code: "WELCOME",
          discountCents: 500,
        });
      }
    });

    it("omits appliedCoupon when the server cart has no applied discount (cf-f3zo)", async () => {
      const fakeCart = { _id: "cart1", lineItems: [{}], appliedDiscounts: [] };
      getCurrentCart.mockResolvedValueOnce(fakeCart);
      wixCartToLines.mockReturnValueOnce([]);
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appliedCoupon).toBeUndefined();
      }
    });
  });
});

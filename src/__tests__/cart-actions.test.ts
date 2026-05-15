import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const addToCart = vi.fn();
const removeFromCart = vi.fn();
const updateLineItemQuantity = vi.fn();
const getCurrentCart = vi.fn();
const wixCartToLines = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/wix/cart", () => ({
  addToCart: (...args: unknown[]) => addToCart(...args),
  removeFromCart: (...args: unknown[]) => removeFromCart(...args),
  updateLineItemQuantity: (...args: unknown[]) =>
    updateLineItemQuantity(...args),
  getCurrentCart: (...args: unknown[]) => getCurrentCart(...args),
  wixCartToLines: (...args: unknown[]) => wixCartToLines(...args),
}));

// Mock the error helper so the real `@sentry/nextjs` import + Sentry.flush
// don't fire during unit tests (would otherwise execute on every error-path
// case below since cart.ts now calls logWixFailure in addItemAction's catch).
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
      const err = new Error("network down");
      addToCart.mockRejectedValueOnce(err);
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 1 });
      expect(result).toEqual({ ok: false, error: "network down" });
      // Sentry tag fires on the failure path with the same error object.
      expect(logWixFailure).toHaveBeenCalledWith("cart", "addItemAction", err);
    });

    it("returns generic error for non-Error throw", async () => {
      addToCart.mockRejectedValueOnce("string rejection");
      const { addItemAction } = await import("@/app/actions/cart");
      const result = await addItemAction({ productId: "p1", quantity: 1 });
      expect(result).toEqual({ ok: false, error: "Unknown cart error" });
      // Non-Error throws still tag Sentry (the helper classifies kind).
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "addItemAction",
        "string rejection",
      );
    });
  });

  describe("removeItemAction", () => {
    it("rejects missing lineItemId", async () => {
      const { removeItemAction } = await import("@/app/actions/cart");
      const result = await removeItemAction("");
      expect(result.ok).toBe(false);
      expect(removeFromCart).not.toHaveBeenCalled();
    });

    it("forwards to removeFromCart", async () => {
      removeFromCart.mockResolvedValueOnce({ _id: "cart1", lineItems: [] });
      const { removeItemAction } = await import("@/app/actions/cart");
      const result = await removeItemAction("li1");
      expect(result.ok).toBe(true);
      expect(removeFromCart).toHaveBeenCalledWith(["li1"]);
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
  });

  describe("getCartAction", () => {
    it("returns cart when getCurrentCart resolves", async () => {
      getCurrentCart.mockResolvedValueOnce(null);
      const { getCartAction } = await import("@/app/actions/cart");
      const result = await getCartAction();
      expect(result).toEqual({ ok: true, cart: null });
    });

    it("returns error on throw", async () => {
      getCurrentCart.mockRejectedValueOnce(new Error("boom"));
      const { getCartAction } = await import("@/app/actions/cart");
      const result = await getCartAction();
      expect(result).toEqual({ ok: false, error: "boom" });
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
      getCurrentCart.mockRejectedValueOnce(new Error("Wix down"));
      const { hydrateCartAction } = await import("@/app/actions/cart");
      const result = await hydrateCartAction();
      expect(result).toEqual({ ok: false, error: "Wix down" });
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  cartItemCount,
  cartReducer,
  cartSubtotalCents,
  EMPTY_CART,
  formatCents,
  makeLineId,
  type CartLineItem,
  type CartState,
} from "@/lib/cart/cart-state";

const line = (overrides: Partial<CartLineItem> = {}): CartLineItem => ({
  id: "p-1",
  productId: "p-1",
  productName: "Carolina Classic Futon",
  quantity: 1,
  unitPriceCents: 79900,
  formattedUnitPrice: "$799.00",
  ...overrides,
});

describe("cartReducer (cf-3qt.2.3)", () => {
  it("adds a new line to an empty cart", () => {
    const next = cartReducer(EMPTY_CART, { type: "add", line: line() });
    expect(next.lines).toHaveLength(1);
    expect(next.lines[0].id).toBe("p-1");
  });

  it("merges an add for the same id by summing quantities", () => {
    const one: CartState = { lines: [line({ quantity: 2 })] };
    const next = cartReducer(one, {
      type: "add",
      line: line({ quantity: 3 }),
    });
    expect(next.lines).toHaveLength(1);
    expect(next.lines[0].quantity).toBe(5);
  });

  it("keeps other lines untouched when adding a duplicate", () => {
    const two: CartState = {
      lines: [line({ id: "p-1" }), line({ id: "p-2", productId: "p-2" })],
    };
    const next = cartReducer(two, {
      type: "add",
      line: line({ id: "p-1", quantity: 1 }),
    });
    expect(next.lines.map((l) => l.id)).toEqual(["p-1", "p-2"]);
    expect(next.lines[0].quantity).toBe(2);
    expect(next.lines[1].quantity).toBe(1);
  });

  it("removes a line by id", () => {
    const state: CartState = {
      lines: [line({ id: "p-1" }), line({ id: "p-2", productId: "p-2" })],
    };
    const next = cartReducer(state, { type: "remove", id: "p-1" });
    expect(next.lines.map((l) => l.id)).toEqual(["p-2"]);
  });

  it("noops when removing an id that isn't present", () => {
    const state: CartState = { lines: [line({ id: "p-1" })] };
    const next = cartReducer(state, { type: "remove", id: "missing" });
    expect(next.lines).toEqual(state.lines);
  });

  it("updates quantity for an existing line", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 1 })] };
    const next = cartReducer(state, {
      type: "setQuantity",
      id: "p-1",
      quantity: 4,
    });
    expect(next.lines[0].quantity).toBe(4);
  });

  it("removes a line when quantity drops to zero", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 1 })] };
    const next = cartReducer(state, {
      type: "setQuantity",
      id: "p-1",
      quantity: 0,
    });
    expect(next.lines).toHaveLength(0);
  });

  it("removes a line when quantity is negative (never persists bad state)", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 2 })] };
    const next = cartReducer(state, {
      type: "setQuantity",
      id: "p-1",
      quantity: -5,
    });
    expect(next.lines).toHaveLength(0);
  });

  it("clears all lines", () => {
    const state: CartState = {
      lines: [line({ id: "p-1" }), line({ id: "p-2", productId: "p-2" })],
    };
    const next = cartReducer(state, { type: "clear" });
    expect(next).toEqual(EMPTY_CART);
  });
});

describe("cart selectors", () => {
  it("counts total items across lines", () => {
    const state: CartState = {
      lines: [
        line({ id: "a", quantity: 2 }),
        line({ id: "b", quantity: 3 }),
      ],
    };
    expect(cartItemCount(state)).toBe(5);
  });

  it("returns zero for an empty cart", () => {
    expect(cartItemCount(EMPTY_CART)).toBe(0);
    expect(cartSubtotalCents(EMPTY_CART)).toBe(0);
  });

  it("computes subtotal in cents (no float drift)", () => {
    const state: CartState = {
      lines: [
        line({ id: "a", unitPriceCents: 79900, quantity: 2 }),
        line({ id: "b", unitPriceCents: 109999, quantity: 1 }),
      ],
    };
    expect(cartSubtotalCents(state)).toBe(79900 * 2 + 109999);
  });
});

describe("formatCents", () => {
  it("formats USD with two-decimal precision", () => {
    expect(formatCents(79900)).toBe("$799.00");
    expect(formatCents(109999)).toBe("$1,099.99");
    expect(formatCents(0)).toBe("$0.00");
  });
});

describe("makeLineId", () => {
  it("uses just productId when no variant", () => {
    expect(makeLineId("p-1")).toBe("p-1");
  });

  it("combines productId and variantId", () => {
    expect(makeLineId("p-1", "v-full-linen")).toBe("p-1:v-full-linen");
  });
});

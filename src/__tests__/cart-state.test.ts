import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cartItemCount,
  cartReducer,
  cartSubtotalCents,
  cartTotalCents,
  EMPTY_CART,
  formatCents,
  makeLineId,
  type CartLineItem,
  type CartState,
} from "@/lib/cart/cart-state";

// The reducer emits a dev-only console.warn when it drops a bad action. We
// silence it at the file level so guard-assert tests stay quiet, but we
// assert the warn fires inside the guard block so observability can't regress
// silently.
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("keeps descriptive fields fresh on merge (server round-trip wins)", () => {
    // Quantities still accumulate, but name/price/etc. update to the latest
    // server-provided values so the drawer can't show stale copy.
    const one: CartState = {
      lines: [
        line({
          quantity: 1,
          productName: "Old Name",
          unitPriceCents: 79900,
          formattedUnitPrice: "$799.00",
        }),
      ],
    };
    const next = cartReducer(one, {
      type: "add",
      line: line({
        quantity: 2,
        productName: "New Name",
        unitPriceCents: 89900,
        formattedUnitPrice: "$899.00",
      }),
    });
    expect(next.lines[0].quantity).toBe(3);
    expect(next.lines[0].productName).toBe("New Name");
    expect(next.lines[0].unitPriceCents).toBe(89900);
    expect(next.lines[0].formattedUnitPrice).toBe("$899.00");
  });

  it("emits a dev-only console.warn when dropping a bad action", () => {
    const warn = vi.spyOn(console, "warn");
    cartReducer(EMPTY_CART, {
      type: "add",
      line: line({ quantity: Number.NaN }),
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("invalid add.quantity"),
    );
  });

  it("warns when remove targets an id that isn't present", () => {
    const warn = vi.spyOn(console, "warn");
    const state: CartState = { lines: [line({ id: "p-1" })] };
    expect(cartReducer(state, { type: "remove", id: "missing" })).toBe(state);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("invalid remove.id"),
    );
  });

  it("warns when setQuantity targets an id that isn't present", () => {
    const warn = vi.spyOn(console, "warn");
    const state: CartState = { lines: [line({ id: "p-1", quantity: 1 })] };
    expect(
      cartReducer(state, {
        type: "setQuantity",
        id: "missing",
        quantity: 5,
      }),
    ).toBe(state);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("invalid setQuantity.id"),
    );
  });

  it("stays silent in production — warn is dev-only", () => {
    // Tripwire: if someone loosens the `NODE_ENV !== "production"` check,
    // production logs start leaking on every cart-state drop. `vi.stubEnv`
    // + the file-scope `restoreAllMocks` afterEach cleans itself up.
    const warn = vi.spyOn(console, "warn");
    vi.stubEnv("NODE_ENV", "production");
    try {
      cartReducer(EMPTY_CART, {
        type: "add",
        line: line({ quantity: Number.NaN }),
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("ignores an add with NaN or non-positive quantity", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 1 })] };
    expect(cartReducer(state, { type: "add", line: line({ id: "p-2", quantity: Number.NaN }) })).toBe(state);
    expect(cartReducer(state, { type: "add", line: line({ id: "p-2", quantity: 0 }) })).toBe(state);
    expect(cartReducer(state, { type: "add", line: line({ id: "p-2", quantity: -1 }) })).toBe(state);
  });

  it("ignores an add with NaN or negative unitPriceCents", () => {
    const state: CartState = { lines: [] };
    expect(
      cartReducer(state, {
        type: "add",
        line: line({ id: "p-bad", unitPriceCents: Number.NaN }),
      }),
    ).toBe(state);
    expect(
      cartReducer(state, {
        type: "add",
        line: line({ id: "p-bad", unitPriceCents: -1 }),
      }),
    ).toBe(state);
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

  it("ignores a negative setQuantity so a broken stepper can't wipe a line", () => {
    // Zero explicitly removes; negatives signal a bug upstream, and keeping
    // the existing line is safer than silently deleting it.
    const state: CartState = { lines: [line({ id: "p-1", quantity: 2 })] };
    const next = cartReducer(state, {
      type: "setQuantity",
      id: "p-1",
      quantity: -5,
    });
    expect(next).toBe(state);
  });

  it("ignores a setQuantity with NaN so a broken stepper can't wipe a line", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 2 })] };
    expect(
      cartReducer(state, {
        type: "setQuantity",
        id: "p-1",
        quantity: Number.NaN,
      }),
    ).toBe(state);
  });

  it("setQuantity for a missing id leaves state untouched", () => {
    const state: CartState = { lines: [line({ id: "p-1", quantity: 1 })] };
    const next = cartReducer(state, {
      type: "setQuantity",
      id: "missing",
      quantity: 5,
    });
    expect(next.lines).toEqual(state.lines);
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

// cf-5qv7 (cf-snil.fu1): applied-coupon state on CartState lets CartDrawer
// surface the discount amount before redirecting to Wix-hosted checkout.
describe("cartReducer — applied-coupon state (cf-5qv7)", () => {
  const sampleLine: CartLineItem = {
    id: "p-1",
    productId: "p-1",
    productName: "Test Product",
    quantity: 1,
    unitPriceCents: 10000,
    formattedUnitPrice: "$100.00",
  };

  it("setCoupon stores the code + discount", () => {
    const state = cartReducer(
      { lines: [sampleLine] },
      { type: "setCoupon", code: "SUMMER15", discountCents: 1500 },
    );
    expect(state.appliedCoupon).toEqual({
      code: "SUMMER15",
      discountCents: 1500,
    });
    expect(state.lines).toHaveLength(1);
  });

  it("setCoupon rejects negative discountCents (no state change)", () => {
    const before = { lines: [sampleLine] };
    const after = cartReducer(before, {
      type: "setCoupon",
      code: "BAD",
      discountCents: -100,
    });
    expect(after).toEqual(before);
  });

  it("setCoupon rejects empty/whitespace code", () => {
    const before = { lines: [sampleLine] };
    expect(
      cartReducer(before, { type: "setCoupon", code: "", discountCents: 100 }),
    ).toEqual(before);
    expect(
      cartReducer(before, { type: "setCoupon", code: "   ", discountCents: 100 }),
    ).toEqual(before);
  });

  it("setCoupon trims surrounding whitespace from the code", () => {
    const state = cartReducer(
      { lines: [sampleLine] },
      { type: "setCoupon", code: "  SUMMER15  ", discountCents: 1500 },
    );
    expect(state.appliedCoupon?.code).toBe("SUMMER15");
  });

  it("clearCoupon removes appliedCoupon but preserves lines", () => {
    const withCoupon = cartReducer(
      { lines: [sampleLine] },
      { type: "setCoupon", code: "SUMMER15", discountCents: 1500 },
    );
    const cleared = cartReducer(withCoupon, { type: "clearCoupon" });
    expect(cleared.appliedCoupon).toBeUndefined();
    expect(cleared.lines).toHaveLength(1);
  });

  it("hydrate carries appliedCoupon when provided", () => {
    const state = cartReducer(EMPTY_CART, {
      type: "hydrate",
      lines: [sampleLine],
      appliedCoupon: { code: "WELCOME", discountCents: 500 },
    });
    expect(state.appliedCoupon).toEqual({
      code: "WELCOME",
      discountCents: 500,
    });
  });

  it("hydrate clears prior appliedCoupon when none provided (authoritative server cart)", () => {
    const withCoupon: CartState = {
      lines: [sampleLine],
      appliedCoupon: { code: "OLD", discountCents: 999 },
    };
    const hydrated = cartReducer(withCoupon, {
      type: "hydrate",
      lines: [sampleLine],
    });
    expect(hydrated.appliedCoupon).toBeUndefined();
  });

  it("add/remove/setQuantity preserve appliedCoupon", () => {
    const withCoupon: CartState = {
      lines: [sampleLine],
      appliedCoupon: { code: "SUMMER15", discountCents: 1500 },
    };
    const added = cartReducer(withCoupon, {
      type: "add",
      line: { ...sampleLine, id: "p-2", productId: "p-2" },
    });
    expect(added.appliedCoupon?.code).toBe("SUMMER15");
    const updated = cartReducer(added, {
      type: "setQuantity",
      id: "p-1",
      quantity: 2,
    });
    expect(updated.appliedCoupon?.code).toBe("SUMMER15");
    const removed = cartReducer(updated, { type: "remove", id: "p-2" });
    expect(removed.appliedCoupon?.code).toBe("SUMMER15");
  });

  it("clear discards appliedCoupon (cart empty → nothing to discount)", () => {
    const withCoupon: CartState = {
      lines: [sampleLine],
      appliedCoupon: { code: "SUMMER15", discountCents: 1500 },
    };
    expect(cartReducer(withCoupon, { type: "clear" })).toEqual(EMPTY_CART);
  });
});

describe("cartTotalCents (cf-5qv7)", () => {
  const sampleLine: CartLineItem = {
    id: "p-1",
    productId: "p-1",
    productName: "Test Product",
    quantity: 2,
    unitPriceCents: 10000,
    formattedUnitPrice: "$100.00",
  };

  it("returns subtotal when no coupon applied", () => {
    expect(cartTotalCents({ lines: [sampleLine] })).toBe(20000);
  });

  it("subtracts discount from subtotal", () => {
    expect(
      cartTotalCents({
        lines: [sampleLine],
        appliedCoupon: { code: "X", discountCents: 1500 },
      }),
    ).toBe(18500);
  });

  it("floors at 0 if discount exceeds subtotal (defensive — Wix shouldn't)", () => {
    expect(
      cartTotalCents({
        lines: [sampleLine],
        appliedCoupon: { code: "X", discountCents: 999999 },
      }),
    ).toBe(0);
  });
});

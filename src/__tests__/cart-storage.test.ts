// cfw-7so: cart-storage round-trip tests. Covers happy path, malformed
// payloads, and graceful failure when localStorage throws (private mode,
// quota exceeded). The reducer guards quantity/price validity, but the
// storage layer is a separate trust boundary — anything in localStorage
// could have been written by a previous app version or a malicious
// extension, so loadCartFromStorage must reject unknown shapes instead of
// trusting them blindly.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CART_STORAGE_KEY,
  loadCartFromStorage,
  saveCartToStorage,
} from "@/lib/cart/cart-storage";
import type { CartLineItem } from "@/lib/cart/cart-state";

const LINE: CartLineItem = {
  id: "p-1",
  productId: "p-1",
  productName: "Carolina Classic Futon",
  quantity: 2,
  unitPriceCents: 79900,
  formattedUnitPrice: "$799.00",
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("cart-storage", () => {
  it("returns null when no snapshot is present", () => {
    expect(loadCartFromStorage()).toBeNull();
  });

  it("round-trips a saved state", () => {
    saveCartToStorage({ lines: [LINE] });
    const loaded = loadCartFromStorage();
    expect(loaded?.lines).toHaveLength(1);
    expect(loaded?.lines[0].productId).toBe("p-1");
    expect(loaded?.lines[0].quantity).toBe(2);
  });

  it("returns null on malformed JSON", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    expect(loadCartFromStorage()).toBeNull();
  });

  it("filters out invalid lines (negative quantity, missing price)", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [
          LINE,
          { ...LINE, id: "bad-1", quantity: -1 },
          { ...LINE, id: "bad-2", unitPriceCents: Number.NaN },
          { ...LINE, id: "bad-3", productName: 123 },
        ],
      }),
    );
    const loaded = loadCartFromStorage();
    expect(loaded?.lines.map((l) => l.id)).toEqual([LINE.id]);
  });

  it("returns null when payload is not an object with a lines array", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(["bare", "array"]));
    expect(loadCartFromStorage()).toBeNull();
  });

  it("does not throw when localStorage.setItem throws (quota / private mode)", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => saveCartToStorage({ lines: [LINE] })).not.toThrow();
    expect(setItemSpy).toHaveBeenCalled();
  });
});

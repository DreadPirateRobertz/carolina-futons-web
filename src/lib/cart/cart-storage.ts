// cfw-7so: localStorage-backed snapshot of CartProvider state so the cart
// survives a hard navigation between PDP and /cart.
//
// Why localStorage and not just CartHydrator?
// On a hard nav (URL bar, page reload, fresh tab) CartProvider remounts with
// EMPTY_CART; the server hydration round-trip is async and gated on a Wix
// session cookie that may not be set yet (fixture mode never writes one). The
// localStorage snapshot lets us paint the cart synchronously on remount while
// CartHydrator's authoritative server fetch settles in the background.

import type { CartLineItem, CartState } from "@/lib/cart/cart-state";

export const CART_STORAGE_KEY = "cf-cart-state-v1";

export function loadCartFromStorage(): CartState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const linesRaw = (parsed as { lines?: unknown }).lines;
    if (!Array.isArray(linesRaw)) return null;
    const lines = linesRaw.filter(isValidLine);
    return { lines };
  } catch {
    return null;
  }
}

export function saveCartToStorage(state: CartState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ lines: state.lines }),
    );
  } catch {
    // localStorage can throw (private browsing, quota). Silent — the cart is
    // best-effort persistence; CartHydrator + Wix are still authoritative.
  }
}

function isValidLine(value: unknown): value is CartLineItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.productId === "string" &&
    typeof v.productName === "string" &&
    typeof v.quantity === "number" &&
    Number.isFinite(v.quantity) &&
    v.quantity > 0 &&
    typeof v.unitPriceCents === "number" &&
    Number.isFinite(v.unitPriceCents) &&
    v.unitPriceCents >= 0 &&
    typeof v.formattedUnitPrice === "string"
  );
}

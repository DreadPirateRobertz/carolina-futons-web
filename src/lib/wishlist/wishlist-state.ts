// Client-side wishlist state — in-memory for fixture/test mode;
// production will proxy to the Velo wishlistService webMethod via
// /api/wishlist once cf-3qt.3 member auth is wired.

import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

export type WishlistState = {
  items: WishlistItem[];
};

// ── Pure state transformers (no side effects, easily unit-testable) ──────────

export function addToWishlist(
  state: WishlistState,
  item: WishlistItem,
): WishlistState {
  if (state.items.some((i) => i.productId === item.productId)) return state;
  return { items: [...state.items, item] };
}

export function removeFromWishlist(
  state: WishlistState,
  productId: string,
): WishlistState {
  return { items: state.items.filter((i) => i.productId !== productId) };
}

export function isOnWishlist(state: WishlistState, productId: string): boolean {
  return state.items.some((i) => i.productId === productId);
}

export function getWishlistTotal(state: WishlistState): number {
  return state.items.length;
}

// ── Fixture-mode helpers ─────────────────────────────────────────────────────

export function makeWishlistItem(
  productId: string,
  name: string,
  price: number,
  productSlug: string,
  imageUrl = "",
  inStock = true,
): WishlistItem {
  return {
    id: `wishlist-${productId}`,
    productId,
    name,
    price,
    priceAtAdd: price,
    imageUrl,
    productSlug,
    inStock,
    addedAt: new Date().toISOString(),
  };
}

"use client";

import { ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";

// Header cart icon. Clicking opens the drawer instead of navigating; the
// count badge is decorative (aria-hidden) and the accessible name carries the
// count so screen readers don't double-announce it.

export function CartTrigger() {
  const { itemCount, openCart } = useCart();
  const label =
    itemCount === 0
      ? "Cart (empty)"
      : `Cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={label}
      data-testid="cart-trigger"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {itemCount > 0 ? (
        <span
          data-testid="cart-trigger-count"
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cf-cta px-1 text-xs font-semibold text-white"
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}

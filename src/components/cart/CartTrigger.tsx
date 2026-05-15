"use client";

import { ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";

// Header cart icon. Clicking opens the drawer instead of navigating; the
// count badge is decorative (aria-hidden) and the accessible name carries the
// count so screen readers don't double-announce it. A sibling aria-live
// region announces count changes so screen-reader users notice when an
// add-to-cart succeeds without refocusing the trigger.
// The ref guard prevents the live region from firing on initial mount —
// ATs treat non-empty live regions at paint time as stale content and ignore
// them unpredictably, but firing on mount trains users to ignore the region.

export function CartTrigger() {
  const { itemCount, openCart } = useCart();
  const prevCountRef = useRef<number | null>(null);
  const [liveText, setLiveText] = useState("");

  useEffect(() => {
    if (prevCountRef.current === null) {
      // Suppress initial-mount announcement — only announce on actual changes.
      prevCountRef.current = itemCount;
      return;
    }
    if (itemCount !== prevCountRef.current) {
      setLiveText(
        itemCount === 0
          ? "Cart is empty"
          : `Cart updated: ${itemCount} ${itemCount === 1 ? "item" : "items"}`,
      );
      prevCountRef.current = itemCount;
    }
  }, [itemCount]);

  const label =
    itemCount === 0
      ? "Cart (empty)"
      : `Cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`;

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        aria-label={label}
        data-testid="cart-trigger"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
      <span
        aria-live="polite"
        aria-atomic="true"
        data-testid="cart-trigger-announcer"
        className="sr-only"
      >
        {liveText}
      </span>
    </>
  );
}

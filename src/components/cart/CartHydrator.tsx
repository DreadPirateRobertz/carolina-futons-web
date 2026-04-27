"use client";

import { useEffect, useRef } from "react";

import { hydrateCartAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

// Runs once on mount to pull the Wix server cart into the in-memory
// CartProvider. Without this, a page refresh shows an empty cart even when
// the visitor's Wix session has items. The hydrate action replaces the entire
// client state so any items already in CartProvider (e.g. from optimistic
// add-to-cart) are preserved if the server cart is empty — we only overwrite
// when the server returns at least one line.
export function CartHydrator() {
  const { dispatch } = useCart();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    hydrateCartAction().then((result) => {
      if (result.ok && result.lines.length > 0) {
        dispatch({ type: "hydrate", lines: result.lines });
      }
    });
  }, [dispatch]);

  return null;
}

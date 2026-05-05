"use client";

import { useEffect, useRef, useState } from "react";

import { hydrateCartAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

// Runs once on mount to pull the Wix server cart into the in-memory
// CartProvider. Without this, a page refresh shows an empty cart even when
// the visitor's Wix session has items. The hydrate action always replaces
// client state with server state so a post-checkout page load clears the
// CartProvider when the Wix cart is empty.
//
// cfw-7so: in fixture mode (NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1) addItemAction
// short-circuits without writing to Wix, so server hydration would always
// return empty and clobber the localStorage-backed snapshot in CartProvider.
// Skip the round-trip entirely and let the local snapshot stand.
export function CartHydrator() {
  const { dispatch } = useCart();
  const hydrated = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    if (process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1") return;

    hydrateCartAction()
      .then((result) => {
        if (result.ok) {
          dispatch({ type: "hydrate", lines: result.lines });
        } else {
          console.error("[CartHydrator] hydrateCartAction failed:", result.error);
          setLoadFailed(true);
        }
      })
      .catch((err) => {
        console.error("[CartHydrator] hydrateCartAction transport error:", err);
        setLoadFailed(true);
      });
  }, [dispatch]);

  if (loadFailed) {
    return (
      <p role="alert" aria-live="assertive" className="sr-only">
        Your cart could not be loaded. Please refresh the page.
      </p>
    );
  }

  return null;
}

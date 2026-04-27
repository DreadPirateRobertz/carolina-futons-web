"use client";

import { useEffect, useRef, useState } from "react";

import { hydrateCartAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

// Runs once on mount to pull the Wix server cart into the in-memory
// CartProvider. Without this, a page refresh shows an empty cart even when
// the visitor's Wix session has items. The hydrate action always replaces
// client state with server state so a post-checkout page load clears the
// CartProvider when the Wix cart is empty.
export function CartHydrator() {
  const { dispatch } = useCart();
  const hydrated = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

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

"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/CartProvider";

// Fires a cart-recovery email trigger when the user leaves with a non-empty
// cart. Uses fetch+keepalive so the request survives navigation. Mounted once
// inside CartProvider — emits at most one trigger per page-visibility-hidden
// event (deduplicated by the sent ref).
export function CartAbandonmentTracker() {
  const { state } = useCart();
  const linesRef = useRef(state.lines);
  const sentRef = useRef(false);

  useEffect(() => {
    linesRef.current = state.lines;
    // Reset dedup guard whenever cart changes so a re-fill after a send works.
    sentRef.current = false;
  }, [state.lines]);

  useEffect(() => {
    function fireRecovery() {
      const lines = linesRef.current;
      if (lines.length === 0 || sentRef.current) return;
      sentRef.current = true;
      fetch("/api/email/trigger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "cart-recovery",
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
        keepalive: true,
      }).catch(() => undefined);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") fireRecovery();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", fireRecovery);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", fireRecovery);
    };
  }, []);

  return null;
}

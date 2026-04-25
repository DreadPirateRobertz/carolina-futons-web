"use client";

import { useEffect, useRef } from "react";

import { trackPurchase, type Ga4Item } from "@/lib/analytics/ga4-events";

// cf-o4ws: GA4 purchase event. Mirrors MetaPurchaseTracker's contract —
// mounted by the order-confirmation page once the order has resolved
// server-side; fires gtag('event', 'purchase', ...) exactly once per
// render (StrictMode dev double-invoke guarded via ref).
//
// All amounts arrive in major units (dollars). The component no-ops if
// gtag never loaded (env unset, blocker, etc.) — order confirmation must
// never break because of analytics.

export type Ga4PurchaseTrackerProps = {
  transactionId: string;
  value: number;
  currency: string;
  items: ReadonlyArray<Ga4Item>;
  tax?: number;
  shipping?: number;
  coupon?: string;
};

export function Ga4PurchaseTracker({
  transactionId,
  value,
  currency,
  items,
  tax,
  shipping,
  coupon,
}: Ga4PurchaseTrackerProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPurchase({
      transaction_id: transactionId,
      value,
      currency,
      items: [...items],
      ...(typeof tax === "number" ? { tax } : {}),
      ...(typeof shipping === "number" ? { shipping } : {}),
      ...(coupon ? { coupon } : {}),
    });
  }, [transactionId, value, currency, items, tax, shipping, coupon]);
  return null;
}

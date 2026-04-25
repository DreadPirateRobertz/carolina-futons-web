"use client";

import { useEffect, useRef } from "react";

import { fireMetaEvent } from "@/components/analytics/MetaPixel";

// cf-3qt.7.3: Meta Pixel Purchase event. Mounted by the order
// confirmation page once the order has resolved server-side. Fires
// fbq('track', 'Purchase', {value, currency, content_ids, content_type})
// exactly once per render (StrictMode dev double-invoke guarded via ref).
//
// Value/currency come from the Wix order priceSummary. The component
// no-ops if MetaPixel never loaded (env unset, blocker, etc.) — order
// confirmation must never break because of analytics.

export type MetaPurchaseTrackerProps = {
  // Numeric order total in major units (e.g. dollars). Server-derived
  // from order.priceSummary.total.amount before render.
  value: number;
  // ISO 4217 currency code (e.g. "USD").
  currency: string;
  // Wix product IDs in the order. Pixel's `content_ids` field expects
  // an array of catalog IDs.
  contentIds: ReadonlyArray<string>;
  // Order ID — sent as eventID to enable Meta's deduplication if a
  // server-side Conversions API call is added later.
  orderId?: string;
};

export function MetaPurchaseTracker({
  value,
  currency,
  contentIds,
  orderId,
}: MetaPurchaseTrackerProps) {
  // Ref-guard so a parent re-render or React 19 StrictMode double-mount
  // doesn't double-fire the Purchase event (which would inflate revenue
  // attribution and is a known footgun in Meta Events Manager).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireMetaEvent(
      "Purchase",
      {
        value,
        currency,
        content_ids: contentIds,
        content_type: "product",
        ...(orderId ? { eventID: orderId } : {}),
      },
    );
  }, [value, currency, contentIds, orderId]);
  return null;
}

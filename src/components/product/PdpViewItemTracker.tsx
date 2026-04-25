"use client";

import { useEffect } from "react";

import { trackViewItem, type Ga4Item } from "@/lib/analytics/ga4-events";

// cf-3qt.7.2: GA4 view_item — fired once per PDP mount.
//
// Server-rendered PDPs need a tiny client island to call gtag('event',
// 'view_item') after hydration. Items + price are passed down as props so
// the tracker doesn't need to re-fetch product data. The dependency array
// keys on item_id so navigating between PDPs (server prop change) re-fires
// once per product, matching GA4's expected one-event-per-view contract.

export function PdpViewItemTracker({ item }: { item: Ga4Item }) {
  useEffect(() => {
    trackViewItem(item);
    // Intentionally key on item_id only — re-firing on every prop identity
    // change would inflate view_item counts when a parent re-renders with
    // a structurally-equal `item` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id]);
  return null;
}

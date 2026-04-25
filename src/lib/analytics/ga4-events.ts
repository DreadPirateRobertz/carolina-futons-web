// cf-3qt.7.2: GA4 ecommerce event helpers.
//
// Typed wrappers around window.gtag('event', ...) that match the GA4
// recommended ecommerce parameter schema:
// https://developers.google.com/analytics/devguides/collection/ga4/reference/events
//
// Each helper is a no-op when window.gtag is not installed (env unset,
// SSR, ad-blocker) so call sites don't need to guard the install state.

export type Ga4Item = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type GtagFn = (
  command: "event",
  eventName: string,
  params?: Record<string, unknown>,
) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

export function trackViewItem(item: Ga4Item, currency = "USD"): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", "view_item", {
    currency,
    value: item.price ?? 0,
    items: [item],
  });
}

export function trackAddToCart(
  item: Ga4Item,
  currency = "USD",
): void {
  const gtag = getGtag();
  if (!gtag) return;
  const quantity = item.quantity ?? 1;
  gtag("event", "add_to_cart", {
    currency,
    value: (item.price ?? 0) * quantity,
    items: [{ ...item, quantity }],
  });
}

export function trackBeginCheckout(
  items: Ga4Item[],
  value: number,
  currency = "USD",
): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", "begin_checkout", { currency, value, items });
}

export function trackPurchase(args: {
  transaction_id: string;
  value: number;
  items: Ga4Item[];
  currency?: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
}): void {
  const gtag = getGtag();
  if (!gtag) return;
  const { currency = "USD", ...rest } = args;
  gtag("event", "purchase", { currency, ...rest });
}

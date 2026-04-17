// Wraps the `currentCart → checkout → redirect` handoff. Phase 2 Checkout
// flow:
//   1. Server Action calls `createCheckout()` → { checkoutId }
//   2. Same action calls `createCheckoutRedirect(checkoutId, { thankYouPageUrl })`
//      → { fullUrl }
//   3. Server Action redirects the browser to `fullUrl` (Wix-hosted payment)
//   4. Wix posts back to `thankYouPageUrl` with orderId; we render
//      /checkout/thank-you.
//
// Keeping (1)+(2) in one helper — `initCheckout` — since callers never want
// the checkoutId without the redirect URL in this migration shape.
import "server-only";

import { getWixClient } from "@/lib/wix-client";

export type CheckoutCallbacks = {
  thankYouPageUrl: string;
  postFlowUrl?: string;
  cartPageUrl?: string;
};

export async function createCheckout() {
  const client = getWixClient();
  const result = await client.currentCart.createCheckoutFromCurrentCart({
    channelType: "WEB",
  });
  if (!result.checkoutId) {
    throw new Error("createCheckoutFromCurrentCart returned no checkoutId");
  }
  return result.checkoutId;
}

export async function getCheckout(checkoutId: string) {
  const client = getWixClient();
  return client.checkout.getCheckout(checkoutId);
}

export async function createCheckoutRedirect(
  checkoutId: string,
  callbacks: CheckoutCallbacks,
) {
  const client = getWixClient();
  const result = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks,
  });
  const fullUrl = result.redirectSession?.fullUrl;
  if (!fullUrl) {
    throw new Error("createRedirectSession returned no fullUrl");
  }
  return { redirectSessionId: result.redirectSession?._id, fullUrl };
}

export async function initCheckout(callbacks: CheckoutCallbacks) {
  const checkoutId = await createCheckout();
  const { fullUrl, redirectSessionId } = await createCheckoutRedirect(
    checkoutId,
    callbacks,
  );
  return { checkoutId, redirectSessionId, fullUrl };
}

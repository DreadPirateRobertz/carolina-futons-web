// Thin typed wrappers around @wix/ecom `currentCart`. Server-only: the
// OAuthStrategy client is stateless per-request so every call re-authenticates
// using the configured client id. For browser-side interactivity, hit a Server
// Action that calls one of these — do not instantiate the Wix client in a
// Client Component.
//
// Phase 2 dual-write plan (see docs/cf-3qt/WEBMETHOD-CATALOG.md § cross-cutting
// concerns): the Velo `cartSessionService` is STILL authoritative for the
// mobile app, which reads `CartSessions` directly by memberId. Once a line
// item is added here, a subsequent RPC call to `cartSessionService.updateCartItems`
// keeps the mobile bridge in sync. That secondary write is intentionally NOT
// in this file — it lives in a higher-level Server Action so the cart write
// succeeds or fails as one unit.
import "server-only";

import { getWixClient } from "@/lib/wix-client";

// Wix Stores app id — constant, used as `catalogReference.appId` for every
// Stores-sourced line item. This is the same across all Wix sites.
export const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

export type LineItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
  options?: Record<string, string>; // choice name -> value, for catalog options
};

function toCatalogReference(item: LineItemInput) {
  const options: Record<string, unknown> = {};
  if (item.variantId) options.variantId = item.variantId;
  if (item.options) options.options = item.options;
  return {
    appId: WIX_STORES_APP_ID,
    catalogItemId: item.productId,
    ...(Object.keys(options).length ? { options } : {}),
  };
}

export async function getCurrentCart() {
  const client = getWixClient();
  try {
    return await client.currentCart.getCurrentCart();
  } catch (err) {
    // `getCurrentCart` throws OWNED_CART_NOT_FOUND when the visitor has no
    // cart yet. Treat as empty rather than propagating — callers expect
    // null for "no cart".
    if (isOwnedCartNotFound(err)) return null;
    throw err;
  }
}

export async function addToCart(items: LineItemInput[]) {
  if (items.length === 0) {
    throw new Error("addToCart called with empty items array");
  }
  const client = getWixClient();
  const result = await client.currentCart.addToCurrentCart({
    lineItems: items.map((item) => ({
      catalogReference: toCatalogReference(item),
      quantity: item.quantity,
    })),
  });
  return result.cart ?? null;
}

export async function removeFromCart(lineItemIds: string[]) {
  if (lineItemIds.length === 0) {
    throw new Error("removeFromCart called with empty lineItemIds array");
  }
  const client = getWixClient();
  const result =
    await client.currentCart.removeLineItemsFromCurrentCart(lineItemIds);
  return result.cart ?? null;
}

export async function updateLineItemQuantity(
  lineItemId: string,
  quantity: number,
) {
  const client = getWixClient();
  const result = await client.currentCart.updateCurrentCartLineItemQuantity([
    { _id: lineItemId, quantity },
  ]);
  return result.cart ?? null;
}

export async function estimateCartTotals() {
  const client = getWixClient();
  return client.currentCart.estimateCurrentCartTotals();
}

export type WixCart = NonNullable<Awaited<ReturnType<typeof getCurrentCart>>>;

function isOwnedCartNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const record = err as Record<string, unknown>;
  const details = (record.details ?? record) as Record<string, unknown>;
  const appErr = details?.applicationError as
    | { code?: string }
    | undefined;
  return appErr?.code === "OWNED_CART_NOT_FOUND";
}

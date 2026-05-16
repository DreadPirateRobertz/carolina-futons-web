// Thin typed wrappers around @wix/ecom `currentCart`. Server-only: the
// OAuthStrategy client is stateless per-request so every call re-authenticates
// using the configured client id. For browser-side interactivity, hit a Server
// Action that calls one of these — do not instantiate the Wix client in a
// Client Component.
//
// Velo `CartSessions` dual-write: the mobile app reads `CartSessions` by
// memberId, so cart writes from the Next.js side must mirror to the Velo
// `cartSession` HTTP function to keep the mobile bridge in sync. The
// fire-and-forget mirror is implemented at the Server Action layer
// (`@/app/actions/cart.ts → syncCartSession`) so cart writes here remain
// pure Wix Stores SDK calls; failure to mirror does not roll back the
// authoritative Stores write. See `cart-session-dual-write.ts`.
import "server-only";

import { makeLineId, type CartLineItem } from "@/lib/cart/cart-state";
import {
  getExistingVisitorCartClient,
  getVisitorCartClient,
} from "./wix-visitor-client";

// Wix Stores app id — constant, used as `catalogReference.appId` for every
// Stores-sourced line item. This is the same across all Wix sites.
export const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

/**
 * Personalization field on a single cart line. Wix surfaces these as
 * `customTextFields` in the order admin + the customer-facing
 * confirmation email — pure pass-through `{ title, value }` pairs.
 *
 * Used by the gift-card "send as a gift" flow (cf-gift-g1) to capture
 * recipient email / sender name / personal message / scheduled-delivery
 * date alongside the gift-card line item.
 */
export type CartLineCustomField = { title: string; value: string };

/**
 * Input shape for {@link addToCart}. `customTextFields` is the cf-gift-g1
 * extension — when present and non-empty, every entry rides along to
 * Wix's `addToCurrentCart` and shows up on the resulting order line.
 * Omitted (or empty array) by default so non-personalized add-to-cart
 * flows keep their pre-cf-gift-g1 byte-identical payload shape.
 */
export type LineItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
  options?: Record<string, string>; // choice name -> value, for catalog options
  customTextFields?: ReadonlyArray<CartLineCustomField>;
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

/**
 * Map a {@link LineItemInput} into the SDK's `addToCurrentCart` line-item
 * shape. Returns `customTextFields` only when the caller supplied a
 * non-empty array; omitting the field entirely matches the pre-cf-gift-g1
 * byte-for-byte payload so non-gift add-to-cart flows are unaffected.
 *
 * Exported for test verification of the personalization pass-through.
 * Production callers should still go through {@link addToCart}.
 */
export function toLineItemPayload(item: LineItemInput) {
  const payload: {
    catalogReference: ReturnType<typeof toCatalogReference>;
    quantity: number;
    customTextFields?: ReadonlyArray<CartLineCustomField>;
  } = {
    catalogReference: toCatalogReference(item),
    quantity: item.quantity,
  };
  if (item.customTextFields && item.customTextFields.length > 0) {
    payload.customTextFields = item.customTextFields;
  }
  return payload;
}

export async function getCurrentCart() {
  // Read-only path: use getExistingVisitorCartClient so we never generate or
  // set a new session cookie here. This prevents a race between a concurrent
  // hydrateCartAction (read) and addItemAction (write) where both would
  // generate distinct visitor tokens and the later Set-Cookie would orphan
  // the item added by the earlier write. cf-p7la.
  const client = await getExistingVisitorCartClient();
  if (!client) return null;
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
  // Fixture product IDs (fixture-*) are not real Wix catalog IDs — Wix rejects
  // them. Short-circuit so addItemAction returns { ok: true } and the optimistic
  // client-side line stays in CartProvider instead of rolling back.
  if (items.every((i) => i.productId.startsWith("fixture-"))) return null;
  const client = await getVisitorCartClient();
  const result = await client.currentCart.addToCurrentCart({
    lineItems: items.map(toLineItemPayload),
  });
  return result.cart ?? null;
}

export async function removeFromCart(lineItemIds: string[]) {
  if (lineItemIds.length === 0) {
    throw new Error("removeFromCart called with empty lineItemIds array");
  }
  const client = await getVisitorCartClient();
  const result =
    await client.currentCart.removeLineItemsFromCurrentCart(lineItemIds);
  return result.cart ?? null;
}

export async function updateLineItemQuantity(
  lineItemId: string,
  quantity: number,
) {
  const client = await getVisitorCartClient();
  const result = await client.currentCart.updateCurrentCartLineItemQuantity([
    { _id: lineItemId, quantity },
  ]);
  return result.cart ?? null;
}

export async function estimateCartTotals() {
  const client = await getVisitorCartClient();
  return client.currentCart.estimateCurrentCartTotals();
}

// cf-snil (cf-wsrr.F2): in-cart coupon entry. The Wix SDK exposes a dedicated
// `couponCode` field on `UpdateCurrentCartOptions` for application and a
// matching `removeCouponFromCurrentCart` method for removal. Surfacing them as
// thin wrappers so the server action layer can validate input + map errors
// without re-implementing the SDK contract.
//
// Errors propagate to the caller — callers (server actions) translate them
// into user-readable text via `toMessage`. Invalid-code rejections from Wix
// arrive as a plain Error whose .message reads roughly "Coupon code not
// valid"; we forward that string verbatim so the user sees the same text the
// Wix-hosted checkout page would show.
export async function applyCoupon(code: string) {
  const client = await getVisitorCartClient();
  const cart = await client.currentCart.updateCurrentCart({ couponCode: code });
  return cart ?? null;
}

export async function removeCoupon() {
  const client = await getVisitorCartClient();
  const result = await client.currentCart.removeCouponFromCurrentCart();
  return result.cart ?? null;
}

// cf-5qv7 (cf-snil.fu1) — restored in cf-f3zo: pull { code, discountCents }
// off the Wix cart's `appliedDiscounts[0]` so the client CartProvider state
// can render the in-cart discount line. Wix's coupon.amount is a decimal
// string ("15.00"); we multiply by 100 and round to lock to integer cents.
//
// Returns undefined when the cart carries no applied coupon (most carts).
// If a future cart ever surfaces multiple appliedDiscounts entries we use
// only the first — historically Wix limits the cart to one active coupon.
//
// Note: this helper was supposed to ship in PR #626 but the lib + actions
// edits were dropped from the merge commit, leaving CartCouponEntry +
// CartHydrator referencing a return field that didn't exist. cf-f3zo
// restores the production code AND backfills the test coverage that was
// the original cf-5qv7.fu1 intent.
// Shape we read off `cart.appliedDiscounts[0].coupon`. Wix's SDK Coupon
// type marks `amount` as @internal, which Vercel's tsc-strict mapped-type
// pipeline narrows away — but at runtime the field is reliably present
// when a coupon is applied (it's what the Wix-hosted checkout page reads
// to show the discount). Local typing routes around the narrowing.
type CouponWithAmount = {
  code?: string;
  amount?: { amount?: string };
};

export function extractAppliedCoupon(
  cart: Pick<WixCart, "appliedDiscounts"> | null | undefined,
): { code: string; discountCents: number } | undefined {
  const first = cart?.appliedDiscounts?.[0];
  const coupon = first?.coupon as CouponWithAmount | undefined;
  const code = coupon?.code;
  const amountStr = coupon?.amount?.amount;
  if (!code || !amountStr) return undefined;
  const cents = Math.round(Number.parseFloat(amountStr) * 100);
  if (!Number.isFinite(cents) || cents < 0) return undefined;
  return { code, discountCents: cents };
}

export type WixCart = NonNullable<Awaited<ReturnType<typeof getCurrentCart>>>;

// Maps a Wix server cart to the CartProvider line format. Used by the cart
// hydration path so the client cart reflects Wix state on page load.
export function wixCartToLines(cart: WixCart): CartLineItem[] {
  const lines: CartLineItem[] = [];
  for (const li of cart.lineItems ?? []) {
    const productId = li.catalogReference?.catalogItemId;
    if (!productId) continue;
    const variantId =
      (li.catalogReference?.options as Record<string, unknown> | undefined)
        ?.variantId as string | undefined;
    const quantity = typeof li.quantity === "number" ? li.quantity : 0;
    if (quantity <= 0) continue;
    const priceRaw = li.price?.amount;
    const priceNum =
      typeof priceRaw === "string" ? Math.round(Number(priceRaw) * 100) : 0;
    if (!Number.isFinite(priceNum) || priceNum <= 0) continue;
    const productName =
      typeof li.productName === "string"
        ? li.productName
        : (li.productName as { original?: string } | undefined)?.original ?? "";
    const imageUrl =
      (li.image as { url?: string } | undefined)?.url ?? undefined;
    lines.push({
      id: makeLineId(productId, variantId),
      productId,
      productName,
      variantId,
      quantity,
      unitPriceCents: priceNum,
      formattedUnitPrice:
        (li.price as { formattedAmount?: string } | undefined)?.formattedAmount ?? "",
      imageUrl,
    });
  }
  return lines;
}

function isOwnedCartNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const record = err as Record<string, unknown>;
  const details = (record.details ?? record) as Record<string, unknown>;
  const appErr = details?.applicationError as
    | { code?: string }
    | undefined;
  return appErr?.code === "OWNED_CART_NOT_FOUND";
}

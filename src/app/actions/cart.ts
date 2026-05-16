"use server";

import { revalidatePath } from "next/cache";
import { type AppliedCoupon, type CartLineItem } from "@/lib/cart/cart-state";
import {
  addToCart,
  applyCoupon,
  getCurrentCart,
  removeCoupon,
  removeFromCart,
  updateLineItemQuantity,
  wixCartToLines,
  type LineItemInput,
  type WixCart,
} from "@/lib/wix/cart";
import { syncCartSession } from "@/lib/wix/cart-session-dual-write";
import { logWixFailure } from "@/lib/wix/errors";

// cf-5qv7 / cfw-yl88: consumers (CartCouponEntry, CartHydrator) read
// `result.appliedCoupon` from these action results — the shape was added
// to the cart-state reducer in cf-5qv7 but the producer-side action
// result types were left without the field, so every PR's typecheck
// failed with TS2339. Field is OPTIONAL because the producer-side
// population from WixCart.appliedDiscounts → AppliedCoupon ships as a
// follow-up; consumers already handle undefined via optional chaining
// (`result.appliedCoupon?.code` + `if (result.appliedCoupon)`).
export type CartActionResult =
  | { ok: true; cart: WixCart | null; appliedCoupon?: AppliedCoupon }
  | { ok: false; error: string };

export type HydrateCartResult =
  | { ok: true; lines: CartLineItem[]; appliedCoupon?: AppliedCoupon }
  | { ok: false; error: string };

export async function addItemAction(
  input: LineItemInput,
): Promise<CartActionResult> {
  if (!input.productId) return { ok: false, error: "Missing productId" };
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "Quantity must be a positive integer" };
  }
  // NEXT_PUBLIC_ vars are baked at build time — read inline so server actions
  // running in a fixture build short-circuit without hitting Wix. cart:null is
  // fine because the client already has the line (optimistic update); ok:true
  // keeps it instead of rolling back.
  if (process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1")
    return { ok: true, cart: null };
  try {
    const cart = await addToCart([input]);
    // cf-cart-session-dual-write: keep the legacy Velo CartSessions mirror
    // in sync so the mobile app (which reads CartSessions by memberId) sees
    // the new line. Fire-and-forget — failure must not block the response.
    syncCartSession(cart);
    revalidatePath("/cart");
    return { ok: true, cart };
  } catch (err) {
    // cf-h78k (cf-8ys6.fu1): pair to remove/update — add-to-cart failure
    // is the most-visible cart catch (every PDP add hits this path).
    // Without the Sentry tag, an outage during a sale-driven burst looks
    // like a "couldn't add" wave with no breadcrumb. cf-f9o1's reference
    // impl was the original `void`-pattern source for the others.
    void logWixFailure("cart", "addItemAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function removeItemAction(
  lineItemId: string,
): Promise<CartActionResult> {
  if (!lineItemId) return { ok: false, error: "Missing lineItemId" };
  try {
    const cart = await removeFromCart([lineItemId]);
    syncCartSession(cart);
    revalidatePath("/cart");
    return { ok: true, cart };
  } catch (err) {
    // cf-8ys6: fire-and-forget Sentry tag so a Wix outage during cart-
    // row removal carries a breadcrumb to triage from. `void` matches
    // the cf-f9o1 reference impl on addItemAction — awaiting
    // logWixFailure would block the user-visible toast on the full
    // Sentry.flush window.
    void logWixFailure("cart", "removeItemAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function updateQuantityAction(
  lineItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!lineItemId) return { ok: false, error: "Missing lineItemId" };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "Quantity must be a positive integer" };
  }
  try {
    const cart = await updateLineItemQuantity(lineItemId, quantity);
    syncCartSession(cart);
    revalidatePath("/cart");
    return { ok: true, cart };
  } catch (err) {
    // cf-8ys6: see removeItemAction for rationale.
    void logWixFailure("cart", "updateQuantityAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

// cf-snil (cf-wsrr.F2): in-cart coupon entry. Wraps wix-cart.applyCoupon /
// removeCoupon for CartDrawer + /cart UI. Trims whitespace from user input
// before forwarding so a "  SUMMER15  " pasted from email-campaign copy
// doesn't get rejected by the SDK's strict-match comparator.
export async function applyCouponAction(
  code: string,
): Promise<CartActionResult> {
  const trimmed = code?.trim() ?? "";
  if (!trimmed) return { ok: false, error: "Enter a promo code" };
  try {
    const cart = await applyCoupon(trimmed);
    revalidatePath("/cart");
    return { ok: true, cart };
  } catch (err) {
    // cf-h78k: invalid-code rejections from Wix carry an "INVALID_ARGUMENT"
    // shape; outages carry generic 5xx. Both are real backend failures
    // worth a breadcrumb — without the tag, an email-campaign coupon
    // glitch looks identical in Sentry to a Wix outage.
    void logWixFailure("cart", "applyCouponAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function removeCouponAction(): Promise<CartActionResult> {
  try {
    const cart = await removeCoupon();
    revalidatePath("/cart");
    return { ok: true, cart };
  } catch (err) {
    // cf-h78k: paired tag to applyCoupon.
    void logWixFailure("cart", "removeCouponAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

export async function getCartAction(): Promise<CartActionResult> {
  try {
    const cart = await getCurrentCart();
    return { ok: true, cart };
  } catch (err) {
    // cf-8ys6: see removeItemAction for rationale.
    void logWixFailure("cart", "getCartAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

// Returns the Wix server cart mapped to CartProvider line format. Used by
// CartHydrator on mount to synchronise client state with the Wix cart so
// the /cart page and CartDrawer reflect server state after a page refresh.
export async function hydrateCartAction(): Promise<HydrateCartResult> {
  try {
    const cart = await getCurrentCart();
    return { ok: true, lines: cart ? wixCartToLines(cart) : [] };
  } catch (err) {
    // cf-8ys6: bead spec's "worst offender" — without this, an empty
    // /cart page on hydrate failure (Wix outage, expired session)
    // lands with no error breadcrumb at all.
    void logWixFailure("cart", "hydrateCartAction", err);
    return { ok: false, error: toMessage(err) };
  }
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown cart error";
}

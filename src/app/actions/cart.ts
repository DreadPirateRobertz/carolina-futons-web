"use server";

import { revalidatePath } from "next/cache";
import { type CartLineItem } from "@/lib/cart/cart-state";
import {
  addToCart,
  getCurrentCart,
  removeFromCart,
  updateLineItemQuantity,
  wixCartToLines,
  type LineItemInput,
  type WixCart,
} from "@/lib/wix/cart";
import { syncCartSession } from "@/lib/wix/cart-session-dual-write";
import { logWixFailure } from "@/lib/wix/errors";

export type CartActionResult =
  | { ok: true; cart: WixCart | null }
  | { ok: false; error: string };

export type HydrateCartResult =
  | { ok: true; lines: CartLineItem[] }
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
    // Sentry-tag add-to-cart failures so a Wix outage stops disappearing
    // into a generic `{ ok: false }` toast. Fire-and-forget — awaiting
    // `logWixFailure` would block the user-visible error by the full
    // `Sentry.flush(2000)` window, holding the optimistic cart line and
    // spinner for ~2s on every failed add. Sentry's in-memory queue
    // flushes on the next request. Matches the reader-layer pattern
    // (plp.ts / products.ts / cross-sell.ts).
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
    return { ok: false, error: toMessage(err) };
  }
}

export async function getCartAction(): Promise<CartActionResult> {
  try {
    const cart = await getCurrentCart();
    return { ok: true, cart };
  } catch (err) {
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
    return { ok: false, error: toMessage(err) };
  }
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown cart error";
}

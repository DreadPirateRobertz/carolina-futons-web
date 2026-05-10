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
import { notifyCartSessionUpdate } from "@/lib/wix/cart-session-dual-write";

// cf-cart-session-dual-write — extract the (cartId, items) shape Velo expects
// from the Wix cart so add/remove/update actions can fire the same dual-write
// helper. Filters out malformed line items defensively; the Velo endpoint is
// fire-and-forget so a bad payload should fail closed without breaking cart.
function dualWritePayload(cart: WixCart | null) {
  if (!cart || !cart._id) return null;
  const items = (cart.lineItems ?? [])
    .map((li) => {
      const productId = li.catalogReference?.catalogItemId;
      const qty = typeof li.quantity === "number" ? li.quantity : 0;
      const priceRaw = li.price?.amount;
      const price =
        typeof priceRaw === "string" ? Number(priceRaw) : undefined;
      if (!productId || qty <= 0) return null;
      return {
        productId,
        qty,
        ...(Number.isFinite(price) ? { price } : {}),
      };
    })
    .filter((x): x is { productId: string; qty: number; price?: number } =>
      x !== null,
    );
  return { sessionToken: cart._id, items };
}

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
    revalidatePath("/cart");
    fireDualWrite(cart);
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }
}

export async function removeItemAction(
  lineItemId: string,
): Promise<CartActionResult> {
  if (!lineItemId) return { ok: false, error: "Missing lineItemId" };
  try {
    const cart = await removeFromCart([lineItemId]);
    revalidatePath("/cart");
    fireDualWrite(cart);
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
    revalidatePath("/cart");
    fireDualWrite(cart);
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }
}

// cf-cart-session-dual-write — best-effort sync to Velo CartSessions.
// Discarding the returned promise is intentional: the action returns to the
// caller while the dual-write is still in flight. The helper itself swallows
// errors so an unhandled-rejection warning is impossible.
function fireDualWrite(cart: WixCart | null): void {
  const payload = dualWritePayload(cart);
  if (!payload) return;
  void notifyCartSessionUpdate(payload.sessionToken, payload.items);
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

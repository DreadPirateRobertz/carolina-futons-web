// cf-cart-session-dual-write: keep the legacy Velo `CartSessions` collection
// in sync with cart writes from the Next.js side so the mobile app (which
// reads CartSessions directly by memberId) sees up-to-date cart state.
//
// This is fire-and-forget: a failure here must NEVER block the user-facing
// cart response. The Wix Stores cart write is authoritative; the dual-write
// is a courtesy sync for the mobile bridge. We log and swallow.
//
// Discovered as a missing impl in the cf-rtd7.1 verification pass (only a
// TODO comment existed in cart.ts). Filed as cf-cart-session-dual-write.

import "server-only";

import type { WixCart } from "./cart";
import { logWixFailure } from "./errors";

const VELO_PATH = "/_functions/cartSession";

type DualWriteItem = {
  productId: string;
  variantId?: string;
  quantity: number;
};

type DualWritePayload = {
  cartId: string;
  items: ReadonlyArray<DualWriteItem>;
};

// Pure helper so the test suite can exercise the wire format without mocking
// fetch. Returns null when the cart shape doesn't carry an _id (no point
// posting a session without an identifier — the mobile bridge keys on it).
export function buildDualWritePayload(
  cart: WixCart | null | undefined,
): DualWritePayload | null {
  if (!cart) return null;
  const cartId = (cart as { _id?: string })._id;
  if (typeof cartId !== "string" || cartId.length === 0) return null;

  const items: DualWriteItem[] = [];
  for (const li of cart.lineItems ?? []) {
    const productId = li.catalogReference?.catalogItemId;
    if (typeof productId !== "string" || productId.length === 0) continue;
    const quantity = typeof li.quantity === "number" ? li.quantity : 0;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const variantId =
      (li.catalogReference?.options as Record<string, unknown> | undefined)
        ?.variantId;
    items.push({
      productId,
      ...(typeof variantId === "string" ? { variantId } : {}),
      quantity,
    });
  }

  return { cartId, items };
}

// Fire-and-forget POST to the Velo `cartSession` HTTP function. Caller does
// NOT await this — the cart Server Action must return as soon as the Wix
// Stores cart write resolves. We schedule the dual-write and let it run on
// the request lifecycle's tail.
//
// Errors are logged and swallowed. Reasons it's safe:
// 1. The Wix Stores cart is the source of truth for purchase flow.
// 2. The Velo `CartSessions` collection is a denormalized mirror for the
//    mobile bridge — a temporary skew there cannot corrupt orders.
// 3. A future cron/reconciler can backfill misses if mobile-side drift
//    becomes measurable.
export function syncCartSession(cart: WixCart | null | undefined): void {
  const payload = buildDualWritePayload(cart);
  if (!payload) return;

  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) return; // unset in fixture / preview builds — no-op

  const url = `${base.replace(/\/$/, "")}${VELO_PATH}`;
  // cf-puqx: header comment promises this function must NEVER throw, but
  // an unguarded JSON.stringify would propagate on circular refs / BigInt
  // / RangeError. Lib-layer defense — caller shapes can drift over time.
  let body: string;
  try {
    body = JSON.stringify(payload);
  } catch (err) {
    void logWixFailure("cart", "syncCartSession", err);
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  })
    .then((res) => {
      // cf-puqx: `fetch().catch()` only sees NETWORK errors. A 4xx/5xx
      // from the Velo bridge resolves the promise with `ok: false` and
      // was previously dropped silently — mobile-app cart drift was the
      // consequence. Surface non-2xx as a Sentry breadcrumb (still
      // fire-and-forget; we never throw).
      if (!res.ok) {
        // cartId is the join key the mobile-app cart-drift triage flow
        // uses to correlate a Velo CartSessions miss back to the Wix
        // Stores cart of record. The synthetic Error is plain (not
        // Wix-SDK-shaped) so logWixFailure's `extra.httpStatus` field
        // stays undefined — both signals (status + cartId) have to live
        // in the message string for on-call to see them.
        //
        // `return`, not `void`: re-attaches the Sentry.flush promise to
        // the fetch chain so Sentry's serverless instrumentation can
        // hold the request open until the event ships, instead of
        // racing the Vercel function freeze.
        return logWixFailure(
          "cart",
          "syncCartSession",
          new Error(
            `velo POST returned HTTP ${res.status} (cartId=${payload.cartId})`,
          ),
        );
      }
      return undefined;
    })
    .catch((err: unknown) => {
      // Same `return` rationale as the HTTP-error branch above — re-attach
      // the flush promise to the chain so Sentry can hold the function
      // open instead of racing the Vercel freeze.
      // cfw-q9rn: logWixFailure already writes the structured
      // [source] op failed console line; the bare console.error here
      // duplicated that. cartId still surfaces in Sentry's `extra`
      // via the Error message at line 115 ("velo POST returned HTTP
      // ... (cartId=...)") for the HTTP-error branch.
      return logWixFailure("cart", "syncCartSession", err);
    });
}

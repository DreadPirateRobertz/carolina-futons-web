import "server-only";

import { callVelo } from "@/lib/wix/velo-client";

// cf-cart-session-dual-write — keep the Velo `CartSessions` collection in
// sync when a cart write succeeds on the cfw side. The Wix mobile app reads
// `CartSessions` directly by memberId; without this dual-write its cart
// view drifts out of sync with whatever the customer last did on the web.
//
// Contract:
// - Fire-and-forget. The user-facing addItem / removeItem / updateQuantity
//   action MUST NOT wait on this call or surface its errors. The web cart
//   write is the source of truth from the customer's perspective; the dual-
//   write is best-effort sync to a secondary surface.
// - Hard timeout via AbortController so a hung Velo endpoint can't leak a
//   pending fetch into the response stream.
// - Failures are swallowed at the helper boundary so callers don't need
//   their own try/catch around it.
//
// The endpoint name `updateCartItems` matches `cartSessionService.web.js`'s
// exported webMethod. Wix exposes it at `${WIX_VELO_SITE_URL}/_functions/
// updateCartItems` once a `post_updateCartItems` HTTP wrapper exists in
// http-functions.js (cfutons-side bead, separate PR). Until that wrapper
// lands the call returns 404 — fine, fire-and-forget eats it. When the
// wrapper lands the dual-write starts succeeding without any cfw change.

const TIMEOUT_MS = 4_000;

export type CartSessionItem = {
  productId: string;
  qty: number;
  price?: number;
};

/**
 * Fire-and-forget POST to Velo `cartSessionService.updateCartItems`. Never
 * throws. Caller does not await unless it specifically wants to ensure
 * scheduling completed before the request unwinds (tests, mostly).
 *
 * @returns A Promise that always resolves — for callers that want to wait
 *          for the round-trip in a test. Production callers MUST NOT await.
 */
export function notifyCartSessionUpdate(
  sessionToken: string,
  items: ReadonlyArray<CartSessionItem>,
): Promise<void> {
  if (!sessionToken) return Promise.resolve();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return callVelo({
    method: "updateCartItems",
    args: [sessionToken, items],
    signal: controller.signal,
  })
    .then(() => undefined)
    .catch((err: unknown) => {
      // Best-effort sync — drop to debug-level logging only. We deliberately
      // do not surface this to Sentry / observability because a perpetually-
      // 404 endpoint (pre-Velo-wrapper) would page on every cart write.
      if (process.env.NODE_ENV !== "production") {
        const msg = err instanceof Error ? err.message : String(err);
        console.debug(`[cart-session-dual-write] swallowed: ${msg}`);
      }
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

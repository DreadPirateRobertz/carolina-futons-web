// Visitor-session-aware Wix client for all cart and checkout operations.
//
// getWixClient() creates a fresh anonymous visitor identity per request —
// addToCart on request A writes to visitor A's Wix cart; createCheckout on
// request B hits visitor B's empty cart. This helper persists the anonymous
// visitor tokens in the wix-session cookie so every cart/checkout call within
// a browsing session uses the same Wix identity.
//
// Member logins also flow through this cookie (OAuthStrategy tokens from
// login callback). getVisitorCartClient() passes whatever tokens are in the
// cookie to getWixClientWithTokens() — member tokens work the same way.
//
// cf-p7la: two variants for read vs write operations.
//
// getVisitorCartClient() — write path (addToCart, checkout). Creates and
// persists a new visitor identity if none exists. All write operations must
// go through this path so the session cookie is set before the browser
// navigates to /checkout.
//
// getExistingVisitorCartClient() — read path (getCurrentCart, hydrateCart).
// Returns null if no session cookie is present. Does NOT generate or set a
// new cookie, which prevents a concurrent hydrateCartAction call from racing
// with addItemAction over which Set-Cookie header the browser stores. If both
// calls ran getVisitorCartClient() concurrently, the later response would
// overwrite the cookie set by the earlier one, orphaning the add's Wix cart.
import "server-only";

import { cookies } from "next/headers";

import {
  parseSessionCookie,
  serializeSessionTokens,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { logWixFailure } from "@/lib/wix/errors";

const VISITOR_SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function getExistingVisitorCartClient() {
  const jar = await cookies();
  const rawCookie = jar.get(SESSION_COOKIE_NAME)?.value;
  const existing = parseSessionCookie(rawCookie);
  if (!existing) return null;
  return getWixClientWithTokens(existing);
}

export async function getVisitorCartClient() {
  const jar = await cookies();
  const rawCookie = jar.get(SESSION_COOKIE_NAME)?.value;
  const existing = parseSessionCookie(rawCookie);
  if (rawCookie && !existing) {
    console.warn("[wix-visitor-client] session cookie present but unparseable — generating fresh visitor identity");
  }
  if (existing) return getWixClientWithTokens(existing);

  try {
    const anonClient = getWixClientWithTokens();
    const tokens = await anonClient.auth.generateVisitorTokens();
    try {
      jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(tokens), {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: VISITOR_SESSION_MAX_AGE,
      });
    } catch (err) {
      // Next.js throws "Cookies can only be modified in a Server Action or
      // Route Handler" from RSC render context. This is expected — the client
      // still has valid tokens for this request but the session won't persist.
      // All other errors are unexpected (serialization bugs, corrupt jar).
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Cookies can only be modified")) {
        console.warn("[wix-visitor-client] jar.set skipped (RSC context) — session will not persist");
      } else {
        // cf-puqx: tag Sentry so unexpected jar.set failures (corrupt
        // jar, serializer crash) stop disappearing into console-only.
        // Fire-and-forget — we still want to return the seeded client
        // for this request even though the session won't persist.
        void logWixFailure("cart", "setVisitorTokens", err);
      }
    }
    return getWixClientWithTokens(tokens);
  } catch (err) {
    // cf-puqx: log with op="generateVisitorTokens" BEFORE re-throwing so
    // the breadcrumb identifies the auth layer as the failure point.
    // The action-level catch (e.g. addItemAction → logWixFailure) will
    // re-tag the same Error after the re-throw — Sentry will see two
    // distinct events sharing the same root Error, distinguished by
    // their `op` tag (auth-layer vs action-layer). This is the
    // layer-boundary signal on-call uses to triage.
    void logWixFailure("cart", "generateVisitorTokens", err);
    throw err;
  }
}

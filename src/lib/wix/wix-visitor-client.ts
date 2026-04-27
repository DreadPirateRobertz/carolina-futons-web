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
import "server-only";

import { cookies } from "next/headers";

import {
  parseSessionCookie,
  serializeSessionTokens,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { getWixClientWithTokens } from "@/lib/wix-client";

const VISITOR_SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function getVisitorCartClient() {
  const jar = await cookies();
  const existing = parseSessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  if (existing) return getWixClientWithTokens(existing);

  try {
    const anonClient = getWixClientWithTokens();
    const tokens = await anonClient.auth.generateVisitorTokens();
    try {
      jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(tokens), {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: VISITOR_SESSION_MAX_AGE,
      });
    } catch {
      // headers already sent (streamed response) — tokens are still valid
      // for this request; cookie will be missing on the next request and
      // a new visitor session will be generated then.
    }
    return getWixClientWithTokens(tokens);
  } catch {
    // Wix token generation failed (network blip) — fall back to a bare
    // anonymous client. Checkout will likely fail but add-to-cart survives.
    return getWixClientWithTokens();
  }
}

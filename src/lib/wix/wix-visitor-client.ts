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
    } catch (err) {
      // Next.js throws "Cookies can only be modified in a Server Action or
      // Route Handler" from RSC render context. This is expected — the client
      // still has valid tokens for this request but the session won't persist.
      // All other errors are unexpected (serialization bugs, corrupt jar).
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Cookies can only be modified")) {
        console.warn("[wix-visitor-client] jar.set skipped (RSC context) — session will not persist");
      } else {
        console.error("[wix-visitor-client] unexpected jar.set failure:", err);
      }
    }
    return getWixClientWithTokens(tokens);
  } catch (err) {
    console.error("[wix-visitor-client] generateVisitorTokens failed:", err);
    return getWixClientWithTokens();
  }
}

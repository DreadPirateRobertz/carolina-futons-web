// Server-only helper that maintains a persistent Wix visitor session via cookie.
//
// Each call to getWixClient() creates a fresh anonymous identity — addItemAction
// and the /checkout route end up with different visitor sessions and therefore
// different carts. This helper reads (or generates) a stable visitor token from
// the wix-session cookie so every server request within a browser session talks
// to the SAME Wix cart.
//
// Member sessions (role: "member") stored in the same cookie are passed through
// unchanged — the member's cart is already scoped to their Wix identity.
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

  if (existing) {
    return getWixClientWithTokens(existing);
  }

  // No session yet — generate anonymous visitor tokens and persist them so
  // subsequent requests (e.g., /checkout) resolve the same Wix cart.
  const anonClient = getWixClientWithTokens();
  const tokens = await anonClient.auth.generateVisitorTokens();
  jar.set(SESSION_COOKIE_NAME, serializeSessionTokens(tokens), {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: VISITOR_SESSION_MAX_AGE,
  });
  return getWixClientWithTokens(tokens);
}

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  parseSessionCookie,
} from "@/lib/auth/session";
import { getWixClientWithTokens } from "@/lib/wix-client";

// cfw-wef (cfw-6qd.1): plain-HTML sign-out target for the owner-mode shell.
//
// The existing DELETE /api/auth/session endpoint clears the cookie and
// returns JSON, which is fine for fetch() callers but forms can only POST.
// This wrapper exists so the admin layout can render a no-JS sign-out
// button: form POST → cookie cleared → redirect to "/".
//
// Only POST is allowed; any other verb 405s. The handler clears the
// session cookie even if the upstream Wix logout call fails, so a
// mid-logout outage can't strand the owner inside owner mode.

export const dynamic = "force-dynamic";

const OAUTH_DATA_COOKIE = "wix-oauth-data";

const deleteCookie = (jar: Awaited<ReturnType<typeof cookies>>, name: string) =>
  jar.delete({ name, path: SESSION_COOKIE_OPTIONS.path });

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const existing = parseSessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  deleteCookie(jar, SESSION_COOKIE_NAME);
  deleteCookie(jar, OAUTH_DATA_COOKIE);

  if (existing) {
    try {
      const client = getWixClientWithTokens(existing);
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}/`;
      await client.auth.logout(origin);
    } catch (err) {
      // Cookie is already cleared — surface the failure for diagnostics
      // but do not block the redirect: the owner is signed out client-side
      // either way.
      console.error("[admin/sign-out] upstream logout failed:", err);
    }
  }

  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

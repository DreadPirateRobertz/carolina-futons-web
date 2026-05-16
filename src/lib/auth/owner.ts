import "server-only";

import { redirect } from "next/navigation";

import { getMemberSession, type MemberSession } from "@/lib/auth/member";
import { logError } from "@/lib/logger";
import { getWixClientWithTokens } from "@/lib/wix-client";

// cfw-wef (cfw-6qd.1): owner-mode auth gate for Brenda's inline-edit Path B.
//
// Wix Members has no first-class "owner" role on storefront sessions — the
// account-level collaborator/owner role lives behind the dashboard auth
// flow, not the member tokens this storefront uses. Headless storefronts
// solve owner detection with an env-driven email allowlist: the site owner
// signs in with a real Wix Members account, and the server checks her
// loginEmail against OWNER_EMAILS (CSV).
//
// `OWNER_EMAILS` is a comma-separated list of lowercase email addresses.
// Empty or unset means owner mode is off — every visitor is a regular
// member and `getOwnerSession` always returns null. Toggle in Vercel env
// without redeploy.
//
// Sub-beads 2-11 (EditableText, /api/admin/site-content, EditableImage,
// audit log, undo) all build on `getOwnerSession()` for their gate.

export const OWNER_EMAILS_ENV = "OWNER_EMAILS";

export type OwnerSession = MemberSession & {
  email: string;
};

/**
 * Parse the OWNER_EMAILS env value into a normalized lowercase Set. Discards
 * blank entries and anything that obviously isn't an email so a stray comma
 * or partial edit doesn't accidentally allowlist the empty string.
 */
export function parseOwnerAllowlist(
  raw: string | undefined | null,
): ReadonlySet<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s.includes("@")),
  );
}

/** True if `email` matches an entry in the OWNER_EMAILS allowlist (case-insensitive). */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseOwnerAllowlist(process.env[OWNER_EMAILS_ENV]);
  return list.has(email.toLowerCase());
}

/**
 * Resolve the current member session AND verify their loginEmail is in the
 * OWNER_EMAILS allowlist. Returns null for any of:
 *   - no session cookie
 *   - signed-in member whose loginEmail isn't allowlisted
 *   - Wix members.getCurrentMember() failure (treated as "not owner" — never
 *     gate ownership on a transient outage in our favor)
 *
 * The Wix call is required because the cached MemberSession only carries
 * tokens + memberId, not the loginEmail (we never asked for it before).
 * EXTENDED fieldset is the cheapest set that includes loginEmail.
 */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  const session = await getMemberSession();
  if (!session) return null;

  let email: string | null = null;
  try {
    const client = getWixClientWithTokens(session.tokens);
    const result = await client.members.getCurrentMember({
      fieldsets: ["EXTENDED"],
    });
    email = result.member?.loginEmail ?? null;
  } catch (err) {
    logError(
      "auth/owner",
      "getCurrentMember failed",
      err instanceof Error ? err : { err },
    );
    return null;
  }

  if (!isOwnerEmail(email)) return null;
  return { ...session, email: email as string };
}

/**
 * Server-side gate for /admin and any owner-mode-only route.
 *
 * Behaviour:
 *   - no session → redirect to /account?next=<callbackUrl> (sign-in flow)
 *   - signed-in non-owner → redirect to "/" (do not leak that /admin exists)
 *   - signed-in owner → return the OwnerSession
 *
 * Always redirects on the failure paths; callers can rely on the return
 * value being a non-null OwnerSession.
 */
export async function requireOwnerSession(
  callbackUrl = "/admin",
): Promise<OwnerSession> {
  const session = await getMemberSession();
  if (!session) {
    redirect(`/account?next=${encodeURIComponent(callbackUrl)}`);
  }
  const owner = await getOwnerSession();
  if (!owner) {
    redirect("/");
  }
  return owner;
}

"use server";

import { cookies } from "next/headers";

import {
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  isConsentChoice,
  type ConsentChoice,
} from "@/lib/consent/consent-state";

// cf-zhkr: persist the user's consent choice in the first-party cf_consent
// cookie. Server-side Set-Cookie so the next request renders the correct
// gtag('consent', 'default', ...) inline before any pixel loads.
export async function setConsentChoice(
  choice: ConsentChoice,
): Promise<{ ok: boolean }> {
  if (!isConsentChoice(choice) || choice === "unknown") {
    return { ok: false };
  }
  const jar = await cookies();
  jar.set(CONSENT_COOKIE_NAME, choice, {
    maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { ok: true };
}

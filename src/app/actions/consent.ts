"use server";

import { cookies } from "next/headers";

import {
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  isConsentChoice,
  isConsentGrantMap,
  type ConsentChoice,
  type ConsentGrantMap,
} from "@/lib/consent/consent-state";

const COOKIE_OPTS = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
};

// cf-zhkr: persist the user's binary consent choice (Accept All / Reject All).
export async function setConsentChoice(
  choice: ConsentChoice,
): Promise<{ ok: boolean }> {
  if (!isConsentChoice(choice) || choice === "unknown") {
    return { ok: false };
  }
  const jar = await cookies();
  jar.set(CONSENT_COOKIE_NAME, choice, COOKIE_OPTS);
  return { ok: true };
}

// cf-yt6r: persist a per-signal granular consent map as JSON in the cookie.
// ConsentMode reads this on the next request and emits the per-signal defaults.
export async function setConsentMap(
  map: ConsentGrantMap,
): Promise<{ ok: boolean }> {
  if (!isConsentGrantMap(map)) {
    return { ok: false };
  }
  const jar = await cookies();
  jar.set(CONSENT_COOKIE_NAME, JSON.stringify(map), COOKIE_OPTS);
  return { ok: true };
}

"use client";

import { useEffect } from "react";

import {
  CONSENT_COOKIE_NAME,
  isConsentChoice,
  isConsentGrantMap,
  consentMapFor,
  type ConsentGrantMap,
} from "@/lib/consent/consent-state";

// cf-0klm — Post-hydration consent update hook.
//
// Companion to <ConsentMode />: the server emits a STATIC "all denied"
// default snippet (no cookies()) so layout.tsx + the whole route tree
// stay ISR-eligible. THIS component runs in a useEffect after hydration,
// reads document.cookie, parses cf_consent, and emits gtag('consent',
// 'update', map) so returning users with a stored choice see their
// granted state restored within a frame of the static default.
//
// First-time visitors (no cookie / "unknown") get no update here —
// <ConsentBanner /> handles the UI flow that flips the cookie + emits
// its own update via setConsentChoice + applyChoice.
//
// Renders null. Side-effect only.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Defensive: this component runs client-side, so it MUST NOT touch
// Node-only APIs (cookies() from next/headers). It reads
// `document.cookie` instead — same surface the legacy ConsentBanner
// already used for its mount-time choice read.
function readConsentCookieRaw(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const entries = document.cookie.split(";");
  for (const entry of entries) {
    const [name, ...rest] = entry.trim().split("=");
    if (name === CONSENT_COOKIE_NAME) {
      // Cookie values can be URI-encoded (JSON-map form). Decode defensively.
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return undefined;
}

// Returns a ConsentGrantMap if the cookie is a recognized "granted" /
// "denied" / ConsentGrantMap shape; null when the cookie is absent
// or unparseable. Mirrors parseConsentCookieAsMap's logic but returns
// null (not denied-fallback) for absent/malformed so the caller can
// no-op rather than emit a stray denied update that would clobber
// the server-emitted static default.
function parseConsentForUpdate(raw: string | undefined): ConsentGrantMap | null {
  if (!raw) return null;
  if (isConsentChoice(raw)) {
    // Binary cookie: "granted" or "denied" or "unknown".
    if (raw === "unknown") return null;
    return consentMapFor(raw);
  }
  // Granular JSON.
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isConsentGrantMap(parsed)) {
      return {
        analytics_storage: parsed.analytics_storage,
        ad_storage: parsed.ad_storage,
        ad_user_data: parsed.ad_user_data,
        ad_personalization: parsed.ad_personalization,
      };
    }
  } catch {
    // Malformed cookie — no-op. Leave the server-emitted denied default
    // in place; ConsentBanner will surface for first-time visitors.
  }
  return null;
}

export function ConsentClientBoot() {
  useEffect(() => {
    const raw = readConsentCookieRaw();
    const map = parseConsentForUpdate(raw);
    if (!map) return;
    // window.gtag is defined by the inline snippet in <ConsentMode />.
    // Defensive: if a future refactor moves ConsentMode out of <head>,
    // we'd silently no-op rather than throw. Keeps the boot path
    // tolerant of upstream change.
    if (typeof window.gtag !== "function") return;
    window.gtag("consent", "update", map);
  }, []);

  return null;
}

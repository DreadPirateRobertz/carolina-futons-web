// cf-zhkr: Google Consent Mode v2 client-side state.
//
// Consent choice is persisted in a first-party cookie so the server can
// read it on the next request and emit the correct gtag('consent', 'default')
// values inline before any pixel script loads. Without that, even a Reject-All
// user would see a brief window where the pixels load with default-granted
// consent (the GA4 / Meta default if you don't emit a 'default' call).
//
// Three states are needed:
// - "unknown": no choice yet → emit denied default + show the banner
// - "granted": Accept All → analytics_storage + ad_storage + ad_user_data + ad_personalization granted
// - "denied":  Reject All → all denied (already the default; cookie just suppresses the banner)
//
// cf-yt6r: granular consent extends this with a per-signal JSON format.
// Cookie value is EITHER the legacy binary string ("granted"/"denied") OR a
// JSON-encoded ConsentGrantMap. Both formats are accepted by parseConsentCookieAsMap.

export type ConsentChoice = "unknown" | "granted" | "denied";

export const CONSENT_COOKIE_NAME = "cf_consent";
// 13 months — Google's recommended max retention for Consent Mode.
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;

const VALID: ReadonlySet<ConsentChoice> = new Set([
  "unknown",
  "granted",
  "denied",
]);

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return typeof value === "string" && VALID.has(value as ConsentChoice);
}

export function parseConsentCookie(raw: string | undefined): ConsentChoice {
  if (!raw) return "unknown";
  // If it's a legacy binary choice, return it directly.
  if (isConsentChoice(raw)) return raw;
  // If it's a granular JSON map, treat it as "granted" for banner purposes
  // (user has already made a choice — don't re-show the banner).
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isConsentGrantMap(parsed)) return "granted";
  } catch {
    // fall through
  }
  return "unknown";
}

// gtag consent fields used by GA4 + Google Ads. Per Consent Mode v2,
// ad_user_data and ad_personalization are required in addition to the
// pre-v2 analytics_storage / ad_storage pair.
export type ConsentGrantMap = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

const GRANT_KEYS: ReadonlyArray<keyof ConsentGrantMap> = [
  "analytics_storage",
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
];

export function isConsentGrantMap(value: unknown): value is ConsentGrantMap {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return GRANT_KEYS.every(
    (k) => obj[k] === "granted" || obj[k] === "denied",
  );
}

export function consentMapFor(choice: ConsentChoice): ConsentGrantMap {
  // Treat "unknown" as denied — the banner is what flips this for granted
  // users. Defaulting to denied is the conservative posture for any region
  // that requires explicit opt-in (EEA/UK/CH); US users opt-out via Reject.
  const grant = choice === "granted" ? "granted" : "denied";
  return {
    analytics_storage: grant,
    ad_storage: grant,
    ad_user_data: grant,
    ad_personalization: grant,
  };
}

// cf-yt6r: parse the cookie into a per-signal map, handling both the legacy
// binary format and the new granular JSON format.
export function parseConsentCookieAsMap(raw: string | undefined): ConsentGrantMap {
  if (!raw) return consentMapFor("denied");
  // Legacy binary.
  if (isConsentChoice(raw)) return consentMapFor(raw);
  // Granular JSON. Project onto the four known keys — never return extra
  // cookie fields that could reach JSON.stringify in ConsentMode's inline script.
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
    // fall through
  }
  return consentMapFor("denied");
}

export const ALL_CONSENT_KEYS = GRANT_KEYS;

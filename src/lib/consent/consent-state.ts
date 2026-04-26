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
  return isConsentChoice(raw) ? raw : "unknown";
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

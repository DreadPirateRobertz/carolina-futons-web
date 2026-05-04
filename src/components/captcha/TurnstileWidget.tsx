"use client";

import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Renders a Cloudflare Turnstile CAPTCHA widget. No-ops when the env var
// is not configured (dev environments without keys).
//
// Turnstile injects a hidden `cf-turnstile-response` field into the
// enclosing form automatically — no JS wiring needed on submit.
export function TurnstileWidget() {
  if (!SITE_KEY) {
    if (process.env.NODE_ENV === "production") {
      return (
        <p role="alert" className="text-sm text-amber-700">
          Security verification is temporarily unavailable. You may submit
          without completing a CAPTCHA — our team will review your request.
        </p>
      );
    }
    return null;
  }
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} />
    </>
  );
}

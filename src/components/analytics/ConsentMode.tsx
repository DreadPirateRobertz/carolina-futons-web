import { cookies } from "next/headers";

import {
  CONSENT_COOKIE_NAME,
  consentMapFor,
  parseConsentCookie,
} from "@/lib/consent/consent-state";

// cf-zhkr: Google Consent Mode v2 default snippet. MUST render BEFORE any
// gtag/fbq/pintrk/ttq script tag so the default consent state is on the
// dataLayer before those libraries read from it.
//
// In the app router there is no _document, so next/script's
// beforeInteractive strategy is unsupported (it only runs from
// pages/_document). The official guidance is to render a plain inline
// <script> tag inside <head> for the rare cases (consent, polyfills) that
// genuinely need to run before hydration. That's what we do here.
//
// XSS posture: the only interpolation into the inline snippet is the
// JSON-stringified consent map, whose values are constrained to the
// literal strings "granted" | "denied" by the consentMapFor() return
// type. No untrusted data flows in, so dangerouslySetInnerHTML is safe.
// Worst case (cookie tampering): the snippet emits a literal "denied"
// payload — same as the default-deny posture.

export async function ConsentMode() {
  const jar = await cookies();
  const choice = parseConsentCookie(jar.get(CONSENT_COOKIE_NAME)?.value);
  const map = consentMapFor(choice);

  const snippet =
    "window.dataLayer = window.dataLayer || [];\n" +
    "window.gtag = window.gtag || function(){dataLayer.push(arguments);};\n" +
    `gtag('consent', 'default', ${JSON.stringify(map)});`;

  return (
    <script
      id="cf-consent-default"
      data-testid="cf-consent-default-script"
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  );
}

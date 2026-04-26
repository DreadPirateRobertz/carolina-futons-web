import { cookies } from "next/headers";

import {
  CONSENT_COOKIE_NAME,
  parseConsentCookieAsMap,
} from "@/lib/consent/consent-state";

// cf-zhkr: Google Consent Mode v2 default snippet. MUST render BEFORE any
// gtag/fbq/pintrk/ttq script tag so the default consent state is on the
// dataLayer before those libraries read from it.
//
// cf-yt6r: parseConsentCookieAsMap handles both the legacy binary string
// ("granted"/"denied") and the new granular JSON map, so per-signal
// defaults are emitted correctly when the user has made a granular choice.
//
// XSS posture: interpolation is the JSON-stringified consent map, whose
// values are constrained to "granted"|"denied". No untrusted data flows in.

export async function ConsentMode() {
  const jar = await cookies();
  const map = parseConsentCookieAsMap(jar.get(CONSENT_COOKIE_NAME)?.value);

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

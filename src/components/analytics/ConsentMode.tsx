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
// ("granted"/"denied") and the new granular JSON map. It projects onto the
// four known keys so extra cookie fields never reach this script.
//
// XSS posture: map values are constrained to "granted"|"denied" by
// parseConsentCookieAsMap's projection. Forward slashes in JSON.stringify
// output are additionally escaped (\/) to guard against </script> injection
// if a future code path ever widens the value surface.

export async function ConsentMode() {
  const jar = await cookies();
  const map = parseConsentCookieAsMap(jar.get(CONSENT_COOKIE_NAME)?.value);
  // Escape forward slashes so a </script> sequence can't terminate the block.
  const safeJson = JSON.stringify(map).replace(/\//g, "\\/");

  const snippet =
    "window.dataLayer = window.dataLayer || [];\n" +
    "window.gtag = window.gtag || function(){dataLayer.push(arguments);};\n" +
    `gtag('consent', 'default', ${safeJson});`;

  return (
    <script
      id="cf-consent-default"
      data-testid="cf-consent-default-script"
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  );
}

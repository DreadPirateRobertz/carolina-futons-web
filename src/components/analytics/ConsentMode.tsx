import {
  ALL_CONSENT_KEYS,
  consentMapFor,
} from "@/lib/consent/consent-state";

// cf-zhkr: Google Consent Mode v2 default snippet. MUST render BEFORE any
// gtag/fbq/pintrk/ttq script tag so the default consent state is on the
// dataLayer before those libraries read from it.
//
// cf-0klm: STATIC "all denied" default — no cookies() call. This unlocks
// ISR site-wide (layout.tsx + this component were the two server-side
// cookies() consumers opting the whole route tree out of static/ISR
// rendering). Returning users with a stored consent choice get upgraded
// post-hydration via <ConsentClientBoot />, which reads document.cookie
// in a useEffect and emits gtag('consent', 'update', map).
//
// GDPR posture: denied-default is the conservative starting state
// required for EEA/UK/CH. Pixels gating on the dataLayer consent state
// will NOT fire until either (a) ConsentClientBoot's update arrives for
// returning users OR (b) the banner Accept action fires gtag('consent',
// 'update', granted-map). Both paths are post-hydration so the static
// default is the only thing on the dataLayer during initial document
// parse — exactly what Consent Mode v2 reference architecture prescribes.

const STATIC_DENIED_MAP = consentMapFor("denied");

// Stringify once at module-init since the snippet is byte-identical across
// requests. Escape forward slashes to neutralize a </script> sequence
// inside the JSON payload (defense-in-depth — the map values are
// constrained to "granted"|"denied" by consentMapFor, so this is belt
// for an already-locked-down surface).
const SAFE_JSON = JSON.stringify(STATIC_DENIED_MAP).replace(/\//g, "\\/");

const SNIPPET =
  "window.dataLayer = window.dataLayer || [];\n" +
  "window.gtag = window.gtag || function(){dataLayer.push(arguments);};\n" +
  `gtag('consent', 'default', ${SAFE_JSON});`;

export function ConsentMode() {
  return (
    <script
      id="cf-consent-default"
      data-testid="cf-consent-default-script"
      dangerouslySetInnerHTML={{ __html: SNIPPET }}
    />
  );
}

// Surfaced for sibling code that needs to verify all four consent keys
// are represented in the static default. Imports the same constant so
// the consent surface stays in lockstep.
export const CONSENT_DEFAULT_KEYS = ALL_CONSENT_KEYS;

import { describe, it, expect } from "vitest";

// cf-0klm: ConsentMode no longer reads cookies(). The inline consent
// default is now byte-identical across all requests ("all denied") so
// layout.tsx + the whole route tree are ISR-eligible. Returning users
// with stored consent upgrade post-hydration via ConsentClientBoot.
//
// GDPR posture: the denied-default is the conservative starting state
// required for EEA/UK/CH. Pixels gating on consent will not fire until
// either (a) the stored consent cookie triggers ConsentClientBoot to
// emit gtag('consent', 'update', granted-map) OR (b) the user clicks
// Accept in the banner which fires the same update.

import { ConsentMode } from "@/components/analytics/ConsentMode";

// ConsentMode renders a plain <script> element with the consent default
// snippet. Post-cf-0klm it's a synchronous server component (no async,
// no cookies()); we assert on the React element directly rather than
// rendering, since react-dom refuses to render the inline script element
// in jsdom without suppressHydrationWarning gymnastics.
function getConsentScript() {
  const ui = ConsentMode() as unknown as {
    type: string;
    props: {
      id?: string;
      "data-testid"?: string;
      dangerouslySetInnerHTML?: { __html: string };
    };
  };
  return ui;
}

describe("<ConsentMode /> — cf-0klm static default", () => {
  it("is NOT async — pure synchronous server component (no cookies())", () => {
    // If ConsentMode becomes async again, this fails: ui will be a
    // Promise, not a React element with .type === 'script'.
    const ui = ConsentMode();
    expect(typeof (ui as { then?: unknown }).then).toBe("undefined");
  });

  it("renders a plain <script> element with the consent default snippet", () => {
    const ui = getConsentScript();
    expect(ui.type).toBe("script");
    expect(ui.props.id).toBe("cf-consent-default");
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain("window.dataLayer");
    expect(snippet).toContain("gtag('consent', 'default'");
  });

  it("emits ALL-DENIED static default (no cookies(), no per-request variation)", () => {
    // Two consecutive calls must produce byte-identical snippets — proving
    // there is no cookie/request-state dependency that would opt the route
    // tree out of ISR.
    const a = getConsentScript().props.dangerouslySetInnerHTML?.__html ?? "";
    const b = getConsentScript().props.dangerouslySetInnerHTML?.__html ?? "";
    expect(a).toBe(b);
    expect(a).toContain('"analytics_storage":"denied"');
    expect(a).toContain('"ad_storage":"denied"');
    expect(a).toContain('"ad_user_data":"denied"');
    expect(a).toContain('"ad_personalization":"denied"');
  });

  it("never emits 'granted' from the static default (returning users get granted via ConsentClientBoot)", () => {
    const snippet =
      getConsentScript().props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).not.toContain('"analytics_storage":"granted"');
    expect(snippet).not.toContain('"ad_storage":"granted"');
    expect(snippet).not.toContain('"ad_user_data":"granted"');
    expect(snippet).not.toContain('"ad_personalization":"granted"');
  });

  it("preserves </script>-escape pattern (defense-in-depth)", () => {
    // Even though the snippet contents are entirely static and don't
    // include user input, preserve the </script>-escape pattern from
    // the pre-cf-0klm code so a future widening can't silently introduce
    // an XSS surface.
    const snippet =
      getConsentScript().props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).not.toMatch(/<\/script>/);
  });
});

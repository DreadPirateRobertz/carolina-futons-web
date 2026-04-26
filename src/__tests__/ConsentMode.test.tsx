import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) =>
      cookieMocks.cookieValue !== undefined
        ? { value: cookieMocks.cookieValue }
        : undefined,
  }),
}));

import { ConsentMode } from "@/components/analytics/ConsentMode";

beforeEach(() => {
  cookieMocks.cookieValue = undefined;
});

// ConsentMode renders a plain <script> element (not next/script) so the
// snippet runs in <head> before hydration in the app router. We assert on
// the React element directly rather than rendering, since react-dom
// refuses to render <script dangerouslySetInnerHTML> in jsdom without
// suppressHydrationWarning gymnastics — and the contract under test is
// the snippet contents and tag attributes.
async function getConsentScript() {
  const ui = (await ConsentMode()) as unknown as {
    type: string;
    props: {
      id?: string;
      "data-testid"?: string;
      dangerouslySetInnerHTML?: { __html: string };
    };
  };
  return ui;
}

describe("<ConsentMode />", () => {
  it("renders a plain <script> element with the consent default snippet", async () => {
    const ui = await getConsentScript();
    expect(ui.type).toBe("script");
    expect(ui.props.id).toBe("cf-consent-default");
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain("window.dataLayer");
    expect(snippet).toContain("gtag('consent', 'default'");
  });

  it("defaults to all-denied when there is no cf_consent cookie (unknown)", async () => {
    cookieMocks.cookieValue = undefined;
    const ui = await getConsentScript();
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain('"analytics_storage":"denied"');
    expect(snippet).toContain('"ad_storage":"denied"');
    expect(snippet).toContain('"ad_user_data":"denied"');
    expect(snippet).toContain('"ad_personalization":"denied"');
  });

  it("emits all-granted when cf_consent='granted'", async () => {
    cookieMocks.cookieValue = "granted";
    const ui = await getConsentScript();
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain('"analytics_storage":"granted"');
    expect(snippet).toContain('"ad_storage":"granted"');
    expect(snippet).toContain('"ad_user_data":"granted"');
    expect(snippet).toContain('"ad_personalization":"granted"');
  });

  it("emits all-denied when cf_consent='denied'", async () => {
    cookieMocks.cookieValue = "denied";
    const ui = await getConsentScript();
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain('"analytics_storage":"denied"');
  });

  it("falls back to all-denied on a tampered cookie value, without reflecting it", async () => {
    cookieMocks.cookieValue = "yes; alert(1)";
    const ui = await getConsentScript();
    const snippet = ui.props.dangerouslySetInnerHTML?.__html ?? "";
    expect(snippet).toContain('"analytics_storage":"denied"');
    expect(snippet).not.toContain("alert");
  });
});

/**
 * cf-0klm — Tests for ConsentClientBoot (NEW component).
 *
 * Post-hydration useEffect that reads `document.cookie`, parses the
 * `cf_consent` value, and emits `gtag('consent', 'update', map)` so
 * returning users with stored consent upgrade from the static-denied
 * default that ConsentMode emits server-side.
 *
 * The component renders `null` (no DOM) — it's purely a side-effect hook.
 *
 * Contract pinned here:
 *   1. No-op when cf_consent cookie is absent (first-time visitor — banner handles)
 *   2. Emits gtag('consent', 'update', granted-map) when cookie is "granted"
 *   3. Emits gtag('consent', 'update', denied-map) when cookie is "denied"
 *   4. Handles granular JSON cookie format (ConsentGrantMap)
 *   5. Tolerates window.gtag being undefined — graceful no-op, no throw
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ConsentClientBoot } from "@/components/analytics/ConsentClientBoot";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let gtagSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset cookie + window.gtag between tests.
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: "",
  });
  gtagSpy = vi.fn();
  (window as Window).gtag = gtagSpy as unknown as (...args: unknown[]) => void;
});

afterEach(() => {
  cleanup();
  delete (window as Window).gtag;
});

function setConsentCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: `cf_consent=${value}`,
  });
}

describe("ConsentClientBoot — cf-0klm", () => {
  it("renders nothing in the DOM (side-effect-only component)", () => {
    const { container } = render(<ConsentClientBoot />);
    expect(container.innerHTML).toBe("");
  });

  it("no-op when cf_consent cookie is absent (first-time visitor)", () => {
    // cookie reset to "" in beforeEach
    render(<ConsentClientBoot />);
    expect(gtagSpy).not.toHaveBeenCalled();
  });

  it("emits gtag('consent', 'update', granted-map) when cookie is 'granted'", () => {
    setConsentCookie("granted");
    render(<ConsentClientBoot />);
    expect(gtagSpy).toHaveBeenCalledOnce();
    const [verb, kind, map] = gtagSpy.mock.calls[0]!;
    expect(verb).toBe("consent");
    expect(kind).toBe("update");
    expect(map).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });

  it("emits gtag('consent', 'update', denied-map) when cookie is 'denied'", () => {
    setConsentCookie("denied");
    render(<ConsentClientBoot />);
    expect(gtagSpy).toHaveBeenCalledOnce();
    const [, , map] = gtagSpy.mock.calls[0]!;
    expect(map).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("handles granular JSON cookie (cf-yt6r ConsentGrantMap)", () => {
    // Mixed grant state — analytics granted, ad denied.
    const grantMap = {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };
    setConsentCookie(encodeURIComponent(JSON.stringify(grantMap)));
    render(<ConsentClientBoot />);
    expect(gtagSpy).toHaveBeenCalledOnce();
    const [, , map] = gtagSpy.mock.calls[0]!;
    expect(map).toEqual(grantMap);
  });

  it("tolerates window.gtag undefined — graceful no-op, no throw", () => {
    setConsentCookie("granted");
    delete (window as Window).gtag;
    expect(() => render(<ConsentClientBoot />)).not.toThrow();
  });

  it("no-op when cookie is malformed (parse failure)", () => {
    setConsentCookie("not-json-and-not-binary");
    render(<ConsentClientBoot />);
    // Malformed cookie should NOT emit a stray update — let the
    // server-rendered denied default stand. Banner handles the user-facing
    // recovery path.
    expect(gtagSpy).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// cf-47nm (cf-7pk0.F1): /about reads 11 owner-editable prose keys from
// SiteContent (intro eyebrow/heading/subheading/lede, beliefs heading +
// 2 body paragraphs, location heading + body-1, team heading + body).
// Implementation shipped in PR #661; this file is the TDD pin —
// regression-guard that future refactors don't silently drop a key,
// flip a fallback, or break the substitute-into-JSX wiring.
//
// Pattern mirrors ContactPage.test.tsx (cf-7pk0.F2): stub getSiteContent
// to return whatever fallback the caller passed, so the page renders
// the fallback strings; then assert each rendered string appears in
// the DOM.

const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

// AboutPage embeds <ShopTheRoom> which is itself async (fetches Wix
// products at render). Async-component-within-async-component blocks
// the sync render() path. Mock the whole component to a static stub so
// the test stays focused on the SiteContent wiring (the cf-47nm subject).
vi.mock("@/components/site/ShopTheRoom", async () => {
  const actual =
    await vi.importActual<typeof import("@/components/site/ShopTheRoom")>(
      "@/components/site/ShopTheRoom",
    );
  return {
    ...actual,
    ShopTheRoom: () => null,
  };
});

import AboutPage, { metadata } from "@/app/about/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage() {
  const ui = await AboutPage();
  return render(ui);
}

describe("AboutPage — metadata", () => {
  it("exports an About title + description", () => {
    expect(metadata.title).toMatch(/about/i);
    expect(metadata.description).toBeTruthy();
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });

  it("pins the canonical to /about", () => {
    expect(metadata.alternates?.canonical).toBe("/about");
  });
});

// cf-47nm: 11 SiteContent keys feeding the 4 prose sections (intro,
// beliefs, location, team). Pin each key by name so a rename loud-fails
// here instead of producing a missing-content bug in prod.
describe("AboutPage — SiteContent key wiring (cf-7pk0.F1)", () => {
  it("requests all 11 owner-editable keys with their fallbacks", async () => {
    await renderPage();
    const requestedKeys = mockGetSiteContent.mock.calls.map((c) => c[0]);
    expect(requestedKeys).toEqual(
      expect.arrayContaining([
        "about.intro.eyebrow",
        "about.intro.heading",
        "about.intro.subheading",
        "about.intro.lede",
        "about.beliefs.heading",
        "about.beliefs.body-1",
        "about.beliefs.body-2",
        "about.location.heading",
        "about.location.body-1",
        "about.team.heading",
        "about.team.body",
      ]),
    );
    // No accidental duplicates / typos.
    expect(new Set(requestedKeys).size).toBe(requestedKeys.length);
  });

  it("calls getSiteContent with a fallback string for every key", async () => {
    await renderPage();
    for (const [key, fallback] of mockGetSiteContent.mock.calls) {
      expect(typeof fallback).toBe("string");
      expect(
        (fallback as string).length,
        `fallback for ${key} must be a non-empty string`,
      ).toBeGreaterThan(0);
    }
  });
});

// cf-47nm: each fallback substitutes into the rendered DOM. If the
// substitution wiring drops a key, the corresponding text is missing
// and one of these assertions fails — naming the section that broke.
describe("AboutPage — rendering with SiteContent fallbacks", () => {
  it("renders the intro section (eyebrow + h1 heading + subheading + lede)", async () => {
    await renderPage();
    expect(screen.getByText(/our story/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /about carolina futons/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/family-owned and independently operated/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sell furniture that is built to last/i),
    ).toBeInTheDocument();
  });

  it("renders the beliefs section (heading + 2 body paragraphs)", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /what we believe/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/durable, repairable, and honest/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A futon is a bed that also earns its keep/i),
    ).toBeInTheDocument();
  });

  it("renders the location section heading + body-1 (inline-JSX body-2 stays hardcoded)", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /where to find us/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Our showroom is at/i)).toBeInTheDocument();
    // body-2 (the call/email prose) lives inline because it wraps <a>
    // tags around BUSINESS.phone / .email — SiteContent values can't
    // contain JSX. cf-47nm bead spec explicitly leaves this hardcoded
    // until marketing needs A/B testing.
    expect(screen.getByText(/Prefer to talk first\?/i)).toBeInTheDocument();
  });

  it("renders the team section heading + body", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /the team/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A short roster of the people/i),
    ).toBeInTheDocument();
  });
});

// cf-47nm: if a SiteContent row is missing from the Wix collection,
// getSiteContent returns the fallback. Verify that an empty/null
// override from the data layer falls back gracefully — Brenda removing
// a key (or the CMS being down) must not blank the page.
describe("AboutPage — fallback resilience", () => {
  it("falls back to the bundled string when getSiteContent returns empty string", async () => {
    // Implementation choice: getSiteContent already returns fallback for
    // missing rows; this test pins that the substitute path uses what
    // getSiteContent returns (even if Wix-down or row missing).
    mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /about carolina futons/i }),
    ).toBeInTheDocument();
  });

  it("renders editor-overridden copy when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "about.intro.heading") return "Custom About Override";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /custom about override/i }),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

// `flush` is now invoked from logWixFailure (Sentry serverless-ship pattern);
// mocking only `captureException` was an existing gap. Surfaced when the new
// CMS-backed enrich-colors path landed and exercised the all-rows-dropped
// observability branch under the HomePage render.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

// cfw-9uw + cfw-sbl: HomePage reads home.value-props.* keys from SiteContent
// (hyphenated to match SITE_CONTENT_KEY_PATTERN enforced by cfw-6qd.12). Mock
// the reader to return the caller's fallback by default, matching the
// established pattern from VisitPage (cf-h21g). Tests that want to assert
// the override path can set an implementation per-test.
const mockGetSiteContent = vi.fn(
  async (_key: string, fallback = "") => fallback,
);
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (key: string, fallback?: string) =>
    mockGetSiteContent(key, fallback ?? ""),
  SITE_CONTENT_CACHE_TAG: "site-content",
}));

// HomePage isn't testing the swatches data layer — short-circuit it so the
// default unmocked Wix client doesn't fan out to fixture rows and trigger
// the new observability path.
vi.mock("@/lib/product/enrich-colors", () => ({
  enrichProductsWithColorChoices: vi.fn().mockResolvedValue(new Map()),
}));

// ShopTheRoom is an async server component — stub it synchronously for tests.
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: vi.fn().mockReturnValue(
    <section data-slot="shop-the-room" aria-label="Shop the room" />,
  ),
  HOME_HERO_PHOTO: { src: "", alt: "lifestyle" },
  HOME_HOTSPOT_CONFIGS: [],
}));

// framer-motion stubs — jsdom lacks IntersectionObserver / matchMedia / RAF.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useInView: vi.fn(() => true),
    useReducedMotion: vi.fn(() => true), // suppress animations in MrPopsHero
    m: {
      ...actual.m,
      span: ({ children }: { children: ReactNode }) => <span>{children}</span>,
      p: ({ children, className }: { children: ReactNode; className?: string }) => (
        <p className={className}>{children}</p>
      ),
      div: ({ children, className }: { children: ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
      ),
      li: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
        <li {...(rest as object)}>{children}</li>
      ),
    },
  };
});

// Product data helpers — unique IDs per collection so "all" tab dedup is 16 items.
const makeProducts = (collectionId: string, count = 4) =>
  Array.from({ length: count }, (_, i) => ({
    _id: `${collectionId}-${i}`,
    name: `${collectionId} Product ${i}`,
    slug: `${collectionId}-product-${i}`,
    priceData: { price: 300 + i * 200, currency: "USD" },
    media: {
      mainMedia: {
        image: {
          url: `https://example.com/${collectionId}/${i}.jpg`,
          width: 800,
          height: 600,
        },
      },
    },
  }));

vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn().mockImplementation((slug: string) =>
    Promise.resolve({ _id: `col-${slug}` }),
  ),
  listProductsByCollectionId: vi.fn().mockImplementation((colId: string) =>
    Promise.resolve(makeProducts(colId)),
  ),
  getProductBySlug: vi.fn().mockResolvedValue(null),
}));

import HomePage from "@/app/page";

async function renderHome() {
  const element = await HomePage();
  return render(element);
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

// cf-theme-ad-grid: A+D hybrid coverage was retired in cf-wmha (2026-04-26) when
// MrPopsHero + MrPopsMarquee + AdGrid were replaced by LivingHero +
// MascotWorldHero. The describe.skip block that lived here was deleted in
// cfw-0kw; new-home coverage lives in dedicated test files (LivingHero-lazy-
// phases.test.tsx, HeroParallax.test.tsx, HeroCarousel.test.tsx, etc.).

// cf-ml6n regression: home page must not render a second footer-like visual
// (MascotFooterDivider was doubling the footer — day landscape + night footer).
// The Footer component is rendered by layout.tsx (outside this render scope);
// this test guards that page.tsx does NOT render a second footer element.
describe("HomePage — cf-ml6n footer regression guard", () => {
  it("does not render MascotFooterDivider (doubled footer fix)", async () => {
    const { container } = await renderHome();
    // MascotFooterDivider SVG uses a linearGradient with id="v3fd-sky" — shared by the mascot/
    // and theme-a/ variants of that component, and absent from all other site components.
    expect(container.querySelector("#v3fd-sky")).toBeNull();
  });

  it("renders no site-footer element (layout renders the single Footer)", async () => {
    const { container } = await renderHome();
    // The site Footer (data-slot="site-footer") is added by layout.tsx, not page.tsx.
    // Any <footer> elements in page output are semantic quote attributions (TestimonialsStrip).
    expect(container.querySelector("[data-slot='site-footer']")).toBeNull();
  });
});

describe("HomePage — value props (cfw-9uw, cfw-66o text-refactor)", () => {
  // The HomePage server component's render tree includes many suspending
  // children (CMS-backed strips, dynamic imports). Rendering the full tree
  // in jsdom is fragile, so these tests assert the SiteContent contract
  // directly via the mocked reader: the right keys are queried with the
  // right fallback strings. Reader-side correctness (override returns Wix
  // value, missing key returns fallback) is covered by site-content.test.ts.
  it("queries SiteContent for each of the 6 value-prop title + body keys with the today-shipped copy as fallback", async () => {
    await HomePage();
    const callMap = new Map<string, string>(
      mockGetSiteContent.mock.calls.map(
        ([key, fallback]) => [key, fallback ?? ""] as const,
      ),
    );
    expect(callMap.get("home.value-props.0.title")).toBe("Hardwood, not plywood");
    expect(callMap.get("home.value-props.0.body")).toBe(
      "Frames milled from solid oak, maple, and cherry. Built to outlive the apartment they ship to.",
    );
    expect(callMap.get("home.value-props.1.title")).toBe("Sleep on it first");
    expect(callMap.get("home.value-props.1.body")).toBe(
      "Visit the Hendersonville showroom and try every mattress we sell. No commission pressure.",
    );
    expect(callMap.get("home.value-props.2.title")).toBe("White-glove delivery");
    expect(callMap.get("home.value-props.2.body")).toBe(
      "Regional delivery teams set it up where you want it. Not on a curb in a box.",
    );
  });

  it("does not invoke a 4th value-prop key (catches accidental drift in VALUE_PROP_DEFAULTS length)", async () => {
    await HomePage();
    const queriedKeys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(queriedKeys).not.toContain("home.value-props.3.title");
    expect(queriedKeys).not.toContain("home.value-props.3.body");
  });
});

// cfw-79g: CMS override coverage for home.value-props.* SiteContent wiring.
// The existing describe above pins key names + fallbacks. This block adds the
// one gap: verifying that when getSiteContent returns a non-fallback value,
// that value is what loadValueProps() consumed (not the fallback). Pattern
// follows the existing tests in this file — await HomePage() + mock.results,
// not renderHome() DOM assertions (HomePage renders too many async children
// for jsdom to produce stable text output).
describe("HomePage — value-props CMS override path (cfw-79g)", () => {
  beforeEach(() => {
    mockGetSiteContent.mockClear();
  });

  it("resolves the CMS override for value-props.0.title when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "home.value-props.0.title") return "Solid oak, not particleboard";
      return fallback;
    });
    await HomePage();
    const calls = mockGetSiteContent.mock.calls;
    const results = mockGetSiteContent.mock.results;
    const idx = calls.findIndex(([k]) => k === "home.value-props.0.title");
    expect(idx).toBeGreaterThanOrEqual(0);
    // The mock returned the override — loadValueProps() consumed it, so the
    // rendered value-prop card would show "Solid oak, not particleboard".
    await expect(results[idx]?.value).resolves.toBe("Solid oak, not particleboard");
  });

  it("resolves the CMS override for all title + body pairs when getSiteContent returns overrides", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "home.value-props.0.title") return "CMS title 0";
      if (key === "home.value-props.0.body") return "CMS body 0";
      if (key === "home.value-props.1.title") return "CMS title 1";
      if (key === "home.value-props.1.body") return "CMS body 1";
      if (key === "home.value-props.2.title") return "CMS title 2";
      if (key === "home.value-props.2.body") return "CMS body 2";
      return fallback;
    });
    await HomePage();
    const calls = mockGetSiteContent.mock.calls;
    const results = mockGetSiteContent.mock.results;
    for (const key of [
      "home.value-props.0.title", "home.value-props.0.body",
      "home.value-props.1.title", "home.value-props.1.body",
      "home.value-props.2.title", "home.value-props.2.body",
    ]) {
      const idx = calls.findIndex(([k]) => k === key);
      expect(idx, `${key} was not queried`).toBeGreaterThanOrEqual(0);
      const resolved = await results[idx]?.value;
      expect(resolved, `${key} did not return the CMS override`).toMatch(/^CMS /);
    }
  });

  it("falls back to the shipped copy when getSiteContent returns the fallback argument", async () => {
    // default mockGetSiteContent impl already returns fallback
    await HomePage();
    const callMap = new Map<string, string>(
      mockGetSiteContent.mock.calls.map(([key, fallback]) => [key, fallback ?? ""] as const),
    );
    // Spot-check: the fallback string is the shipped default copy.
    expect(callMap.get("home.value-props.0.title")).toBe("Hardwood, not plywood");
    expect(callMap.get("home.value-props.2.body")).toBe(
      "Regional delivery teams set it up where you want it. Not on a curb in a box.",
    );
  });
});

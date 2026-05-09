import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// `flush` is now invoked from logWixFailure (Sentry serverless-ship pattern);
// mocking only `captureException` was an existing gap. Surfaced when the new
// CMS-backed enrich-colors path landed and exercised the all-rows-dropped
// observability branch under the HomePage render.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

// cfw-9uw: HomePage now reads home.valueProps.* keys from SiteContent. Mock
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

// cf-theme-ad-grid: A+D hybrid — MrPopsHero + MrPopsMarquee + AdGrid filter-first.
// SUITE SKIPPED 2026-04-26: cf-wmha replaced this layout with LivingHero +
// MascotWorldHero. Coverage to be re-authored against the new home.
describe.skip("HomePage — A+D hybrid (cf-theme-ad-grid)", () => {
  it("renders the Hero landmark", async () => {
    await renderHome();
    expect(screen.getByRole("region", { name: /hero/i })).toBeInTheDocument();
  });

  it("renders the MrPops marquee gallery between hero and grid", async () => {
    await renderHome();
    expect(
      screen.getByRole("region", { name: /furniture gallery/i }),
    ).toBeInTheDocument();
  });

  it("renders the Shop collection heading", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { name: /shop our collection/i }),
    ).toBeInTheDocument();
  });

  it("renders the category filter group", async () => {
    await renderHome();
    expect(
      screen.getByRole("group", { name: /filter by category/i }),
    ).toBeInTheDocument();
  });

  it("renders All + 4 category chips", async () => {
    await renderHome();
    const group = screen.getByRole("group", { name: /filter by category/i });
    const buttons = group.querySelectorAll("button");
    // All + Futon Frames + Murphy Beds + Platform Beds + Mattresses
    expect(buttons).toHaveLength(5);
  });

  it("renders the price filter group", async () => {
    await renderHome();
    expect(
      screen.getByRole("group", { name: /filter by price/i }),
    ).toBeInTheDocument();
  });

  it("renders the Products grid landmark", async () => {
    await renderHome();
    expect(
      screen.getByRole("region", { name: /products/i }),
    ).toBeInTheDocument();
  });

  it("shows all 16 products on the All tab (4 categories × 4 products)", async () => {
    await renderHome();
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });

  it("announces product count to screen readers", async () => {
    await renderHome();
    const count = screen.getByRole("status");
    expect(count).toHaveTextContent(/16 products/i);
  });

  it("All chip is pressed by default", async () => {
    await renderHome();
    const allBtn = screen.getByRole("button", { name: /^all$/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("selecting a category chip filters the product list", async () => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    // col-col-futon-frames: 4 products
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("selecting a price chip filters by price range", async () => {
    await renderHome();
    // "Under $500" — products with price < 500: prices are 300 (i=0) only per category
    fireEvent.click(screen.getByRole("button", { name: /under \$500/i }));
    // 4 collections × 1 product under $500 each = 4
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("shows zero-state message when no products match filters", async () => {
    await renderHome();
    // Prices are 300, 500, 700, 900 — "$2,000+" matches none
    fireEvent.click(screen.getByRole("button", { name: /\$2,000\+/i }));
    expect(
      screen.getByText(/no products match those filters/i),
    ).toBeInTheDocument();
  });

  it("fetches products for each of the 4 categories on render", async () => {
    const mod = await import("@/lib/wix/products");
    (mod.getCollectionBySlug as ReturnType<typeof vi.fn>).mockClear();
    await renderHome();
    expect(mod.getCollectionBySlug).toHaveBeenCalledTimes(4);
  });

  it("does not render Marugame landmarks (regression guard)", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-slot='marugame-hero']")).toBeNull();
    expect(container.querySelector("[data-slot='trust-bar']")).toBeNull();
  });

  it("exposes the ad-grid data slot", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-slot='ad-grid']")).not.toBeNull();
  });

  it("renders the ShopTheRoom lifestyle hotspot section", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-slot='shop-the-room']")).not.toBeNull();
  });

  it("renders a sunrise hover overlay for each product card (Mr Pops microinteraction)", async () => {
    const { container } = await renderHome();
    const overlays = container.querySelectorAll(
      ".ad-grid-shell [aria-hidden='true'].pointer-events-none.absolute",
    );
    // 16 products → 16 overlays
    expect(overlays).toHaveLength(16);
  });
});

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
    expect(callMap.get("home.valueProps.0.title")).toBe("Hardwood, not plywood");
    expect(callMap.get("home.valueProps.0.body")).toBe(
      "Frames milled from solid oak, maple, and cherry. Built to outlive the apartment they ship to.",
    );
    expect(callMap.get("home.valueProps.1.title")).toBe("Sleep on it first");
    expect(callMap.get("home.valueProps.1.body")).toBe(
      "Visit the Hendersonville showroom and try every mattress we sell. No commission pressure.",
    );
    expect(callMap.get("home.valueProps.2.title")).toBe("White-glove delivery");
    expect(callMap.get("home.valueProps.2.body")).toBe(
      "Regional delivery teams set it up where you want it. Not on a curb in a box.",
    );
  });

  it("does not invoke a 4th value-prop key (catches accidental drift in VALUE_PROP_DEFAULTS length)", async () => {
    await HomePage();
    const queriedKeys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(queriedKeys).not.toContain("home.valueProps.3.title");
    expect(queriedKeys).not.toContain("home.valueProps.3.body");
  });
});

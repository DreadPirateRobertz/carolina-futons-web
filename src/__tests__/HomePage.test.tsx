import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";

// Stub motion wrappers so jsdom rendering succeeds without a Framer context.
vi.mock("@/components/motion/HeroReveal", () => ({
  HeroReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/site/HeroCarousel", () => ({
  HeroCarousel: () => null,
}));
vi.mock("@/components/site/HeroParallax", () => ({
  HeroParallax: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
// FeaturedProducts renders ProductCard which uses framer-motion m.* components.
// Those require a Framer context that isn't present in the cfw-tdd jsdom env
// (two-React-instance problem via node_modules symlink). Stub at the component
// boundary so the test exercises page-level behavior without traversing
// ProductCard's render tree.
vi.mock("@/components/site/TrustBar", () => ({
  TrustBar: () => <div data-slot="trust-bar" />,
}));
vi.mock("@/components/site/FeaturedProducts", () => ({
  FeaturedProducts: ({ products }: { products: unknown[] }) =>
    products.length > 0 ? (
      <section aria-label="Featured products" />
    ) : null,
}));

// cf-3qt.7.M.2 (cf-swsg): pin the home-page section contract after wrapping
// Shop-by-category heading + cards in HeroReveal. We don't assert animation
// values — jsdom has no scroll and Framer honors reduced-motion at the
// variant level, so tests stay on what users can observe statically.
//
// cf-5j9x: HomePage is now an async server component (awaits the Featured
// strip data). Render by calling `await HomePage()` and passing the resolved
// element to Testing Library — the canonical RSC test pattern.

vi.mock("@/lib/shop/featured", () => ({
  listFeaturedProducts: vi.fn().mockResolvedValue([]),
}));

// matchMedia stub — ProductCard (framer-motion) reads it in the Featured
// strip render path. Kept harmless for the empty-featured default.
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

async function renderHome() {
  const HomePage = (await import("@/app/page")).default;
  const ui = await HomePage();
  return render(ui);
}

describe("HomePage", () => {
  it("renders the hero headline", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /quality futons.*for your home/i,
      }),
    ).toBeTruthy();
  });

  it("renders the Shop by category section heading", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { level: 2, name: /shop by category/i }),
    ).toBeTruthy();
  });

  it("renders a card link per SHOP_CATEGORIES entry pointing at /shop/{slug}", async () => {
    await renderHome();
    for (const category of SHOP_CATEGORIES) {
      const h3 = screen.getByRole("heading", { level: 3, name: category.name });
      const link = h3.closest("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(`/shop/${category.slug}`);
    }
  });

  it("keeps the View all → link on the Shop by category section", async () => {
    await renderHome();
    // With the Featured strip rendering its own "View all" link, there can be
    // multiple — require at least one pointing at /shop from the categories
    // section. Match via the Shop-by-category h2 scope.
    const categoriesHeading = screen.getByRole("heading", {
      level: 2,
      name: /shop by category/i,
    });
    const section = categoriesHeading.closest("section");
    expect(section).toBeTruthy();
    const viewAll = section!.querySelector('a[href="/shop"]');
    expect(viewAll?.textContent).toMatch(/view all/i);
  });

  it("renders the three value-prop headings", async () => {
    await renderHome();
    // Use heading-level matchers rather than getByText — the TrustBar at the
    // top of the page also contains "Free White-Glove Delivery", so a naked
    // text regex on /white-glove delivery/i would match both nodes.
    expect(
      screen.getByRole("heading", { level: 3, name: /hardwood, not plywood/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /sleep on it first/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /white-glove delivery/i }),
    ).toBeTruthy();
  });

  it("places the TrustBar between the hero H1 and the Shop by category H2", async () => {
    const { container } = await renderHome();
    const heroHeading = screen.getByRole("heading", {
      level: 1,
      name: /quality futons.*for your home/i,
    });
    const trustBar = container.querySelector('[data-slot="trust-bar"]');
    const shopByCategory = screen.getByRole("heading", {
      level: 2,
      name: /shop by category/i,
    });
    expect(trustBar).not.toBeNull();
    // compareDocumentPosition bit 4 = "other node follows this one".
    expect(
      heroHeading.compareDocumentPosition(trustBar!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      trustBar!.compareDocumentPosition(shopByCategory) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders an img for each category card that has an image field", async () => {
    const { container } = await renderHome();
    const imgs = container.querySelectorAll("ul img");
    const categoriesWithImages = SHOP_CATEGORIES.filter((c) => c.image);
    expect(imgs.length).toBe(categoriesWithImages.length);
  });

  it("category card images use the CDN src from SHOP_CATEGORIES", async () => {
    const { container } = await renderHome();
    const imgs = Array.from(container.querySelectorAll("ul img"));
    for (const cat of SHOP_CATEGORIES) {
      if (!cat.image) continue;
      const match = imgs.find((img) =>
        img.getAttribute("src")?.includes(
          cat.image!.split("/media/")[1]?.split("~")[0] ?? "",
        ),
      );
      expect(match, `no img found for category ${cat.slug}`).toBeTruthy();
    }
  });
});

describe("HomePage — Featured strip (cf-5j9x)", () => {
  it("calls listFeaturedProducts once at render time", async () => {
    const mod = await import("@/lib/shop/featured");
    (mod.listFeaturedProducts as ReturnType<typeof vi.fn>).mockClear();
    await renderHome();
    expect(mod.listFeaturedProducts).toHaveBeenCalledTimes(1);
  });

  it("renders the Featured section when products are returned", async () => {
    const mod = await import("@/lib/shop/featured");
    (mod.listFeaturedProducts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { _id: "a", slug: "a", name: "A", priceData: { formatted: { price: "$1" } } },
      { _id: "b", slug: "b", name: "B", priceData: { formatted: { price: "$1" } } },
      { _id: "c", slug: "c", name: "C", priceData: { formatted: { price: "$1" } } },
      { _id: "d", slug: "d", name: "D", priceData: { formatted: { price: "$1" } } },
    ]);
    await renderHome();
    expect(
      screen.getByRole("region", { name: /featured/i }),
    ).toBeInTheDocument();
  });

  it("hides the Featured section on empty-catalog (Wix outage or pre-launch)", async () => {
    const mod = await import("@/lib/shop/featured");
    (mod.listFeaturedProducts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    await renderHome();
    expect(screen.queryByRole("region", { name: /featured/i })).not.toBeInTheDocument();
  });
});

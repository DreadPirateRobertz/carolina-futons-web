import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SHOP_CATEGORIES } from "@/lib/shop/categories";

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

  it("renders a thumbnail img per category with the configured image URL", async () => {
    await renderHome();
    for (const category of SHOP_CATEGORIES) {
      if (!category.image) continue;
      const h3 = screen.getByRole("heading", { level: 3, name: category.name });
      const card = h3.closest("a");
      expect(card).toBeTruthy();
      const img = card!.querySelector("img");
      expect(img).toBeTruthy();
      // next/image rewrites src through /_next/image with the original encoded
      // in the `url` query param. Assert the source URL is referenced rather
      // than matching the rewritten src verbatim.
      const src = img!.getAttribute("src") ?? "";
      expect(decodeURIComponent(src)).toContain(category.image);
    }
  });

  it("renders the three value-prop headings", async () => {
    await renderHome();
    expect(screen.getByText(/hardwood, not plywood/i)).toBeTruthy();
    expect(screen.getByText(/sleep on it first/i)).toBeTruthy();
    expect(screen.getByText(/white-glove delivery/i)).toBeTruthy();
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

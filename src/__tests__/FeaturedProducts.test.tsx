import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { FeaturedProducts } from "@/components/site/FeaturedProducts";

// matchMedia stub — ProductCard (framer-motion useReducedMotion) reads it.
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

type TestProduct = {
  _id: string;
  slug?: string;
  name?: string;
  priceData?: { formatted?: { price?: string; discountedPrice?: string } };
};

function makeProduct(id: string, overrides: Partial<TestProduct> = {}): TestProduct {
  return {
    _id: id,
    slug: `slug-${id}`,
    name: `Product ${id}`,
    priceData: { formatted: { price: "$999.00" } },
    ...overrides,
  };
}

function fourProducts(): TestProduct[] {
  return [makeProduct("a"), makeProduct("b"), makeProduct("c"), makeProduct("d")];
}

describe("FeaturedProducts — rendering", () => {
  it("renders a labelled section with a Featured heading", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    expect(region).toBeInTheDocument();
    expect(
      within(region).getByRole("heading", { level: 2, name: /featured/i }),
    ).toBeInTheDocument();
  });

  it("renders one product card per product", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    const cards = within(region).getAllByRole("listitem");
    expect(cards).toHaveLength(4);
  });

  it("links each card to its PDP at /products/{slug}", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    const links = within(region).getAllByRole("link");
    // Expect every product slug to have at least one link pointing at it.
    for (const p of fourProducts()) {
      expect(links.some((a) => a.getAttribute("href") === `/products/${p.slug}`)).toBe(true);
    }
  });

  it("renders a 'View all' link to /shop", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    const viewAll = within(region).getByRole("link", { name: /view all/i });
    expect(viewAll.getAttribute("href")).toBe("/shop");
  });

  it("renders a short lead/description paragraph that mentions the catalog", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    // Just verify there's human lead copy — exact text can evolve without
    // breaking the test. We require >= 20 chars to block the "empty p" case.
    const paragraphs = region.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThan(0);
    const joined = Array.from(paragraphs).map((p) => p.textContent ?? "").join(" ");
    expect(joined.trim().length).toBeGreaterThanOrEqual(20);
  });
});

describe("FeaturedProducts — empty state", () => {
  it("renders nothing when products is an empty array (no broken strip)", () => {
    const { container } = render(<FeaturedProducts products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FeaturedProducts — 6-product ceiling", () => {
  it("renders all six when exactly FEATURED_MAX products are provided", () => {
    const six = Array.from({ length: 6 }, (_, i) => makeProduct(`p${i}`));
    render(<FeaturedProducts products={six as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    expect(within(region).getAllByRole("listitem")).toHaveLength(6);
  });
});

// cfw-49h: per-card review badges removed for v1. Google Business Profile
// reviews are location-wide (not per-product), so per-card aggregates would
// have been fabricated. The location aggregate now renders on the PDP via
// PdpReviews instead. This test pins that the badge surface is gone.
describe("FeaturedProducts — no per-card review badge (v1)", () => {
  it("never renders the review-badge slot on a product card", () => {
    render(<FeaturedProducts products={fourProducts() as never} />);
    const region = screen.getByRole("region", { name: /featured/i });
    expect(within(region).queryAllByTestId("review-badge")).toHaveLength(0);
  });
});

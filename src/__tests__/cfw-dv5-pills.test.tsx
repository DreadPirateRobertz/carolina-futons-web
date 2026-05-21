// cfw-dv5: sub-category pills — parseSearchParams sub param, CategoryPills
// component, and PlpPage integration tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import React from "react";

// ── Module-level stubs (mirrors plp-page.test.tsx) ───────────────────────────
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/wix-client", () => ({ getWixClient: vi.fn() }));
vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn(),
  listProductsByCollectionId: vi.fn(),
  listProductsOnSale: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/wix/plp", () => ({ getCollectionPlp: vi.fn() }));
vi.mock("@/lib/shop/categories", () => ({
  SHOP_CATEGORIES: [],
  findCategory: vi.fn(),
}));
vi.mock("@/lib/shop/plp-observability", () => ({ logOverPaginatedRender: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: () => null,
  PLP_SHOP_THE_ROOM_CONFIGS: {},
}));
vi.mock("@/lib/wix/product-badges", () => ({
  listAllProductBadges: vi.fn().mockResolvedValue(new Map()),
}));
// Stub CategoryPills for PlpPage integration tests — unit tests use vi.importActual.
vi.mock("@/components/shop/CategoryPills", () => ({
  CategoryPills: ({
    subcategories,
    categorySlug,
    activeSub,
  }: {
    subcategories: Array<{ slug: string; name: string }>;
    categorySlug: string;
    activeSub?: string;
  }) =>
    React.createElement(
      "nav",
      { "data-testid": "category-pills" },
      ...subcategories.map((s) =>
        React.createElement(
          "a",
          {
            key: s.slug,
            href: `/shop/${categorySlug}?sub=${s.slug}`,
            "aria-current": activeSub === s.slug ? "page" : undefined,
          },
          s.name,
        ),
      ),
    ),
}));

// ── parseSearchParams — sub param ────────────────────────────────────────────

import { parseSearchParams } from "@/app/shop/[category]/page";

describe("parseSearchParams — sub param (cfw-dv5)", () => {
  it("returns sub undefined when not present", () => {
    expect(parseSearchParams({}).sub).toBeUndefined();
  });

  it("extracts sub string from search params", () => {
    expect(parseSearchParams({ sub: "wall-huggers" }).sub).toBe("wall-huggers");
  });

  it("uses first value when sub is an array", () => {
    expect(
      parseSearchParams({ sub: ["wall-huggers", "rustic-log"] }).sub,
    ).toBe("wall-huggers");
  });

  it("existing defaults remain unchanged after adding sub", () => {
    const result = parseSearchParams({});
    expect(result.pageNum).toBe(1);
    expect(result.sort).toBe("featured");
    expect(result.priceMin).toBeUndefined();
    expect(result.priceMax).toBeUndefined();
    expect(result.inStockOnly).toBe(false);
  });
});

// ── CategoryPills component unit tests ───────────────────────────────────────
// Use vi.importActual to bypass the module-level mock and test the real component.
// In RED state (component not yet created), importActual throws "Cannot find module"
// → each test fails with a clear signal about what's missing.

const STUB_SUBS = [
  { slug: "wall-huggers", name: "Wall Huggers", nameContains: "Wall Hugger" },
  { slug: "rustic-log", name: "Rustic Log", nameContains: "Rustic Log" },
];

describe("CategoryPills (cfw-dv5)", () => {
  it("renders an All pill linking to the base category URL", async () => {
    const { CategoryPills } = await vi.importActual<
      typeof import("@/components/shop/CategoryPills")
    >("@/components/shop/CategoryPills");

    const html = renderToStaticMarkup(
      CategoryPills({
        subcategories: STUB_SUBS,
        activeSub: undefined,
        categorySlug: "futon-frames",
      }) as ReactElement,
    );

    expect(html).toContain("All");
    expect(html).toMatch(/href="\/shop\/futon-frames"/);
  });

  it("renders a pill per subcategory", async () => {
    const { CategoryPills } = await vi.importActual<
      typeof import("@/components/shop/CategoryPills")
    >("@/components/shop/CategoryPills");

    const html = renderToStaticMarkup(
      CategoryPills({
        subcategories: STUB_SUBS,
        activeSub: undefined,
        categorySlug: "futon-frames",
      }) as ReactElement,
    );

    expect(html).toContain("Wall Huggers");
    expect(html).toContain("Rustic Log");
  });

  it("sub pill href includes ?sub=<slug>", async () => {
    const { CategoryPills } = await vi.importActual<
      typeof import("@/components/shop/CategoryPills")
    >("@/components/shop/CategoryPills");

    const html = renderToStaticMarkup(
      CategoryPills({
        subcategories: STUB_SUBS,
        activeSub: undefined,
        categorySlug: "futon-frames",
      }) as ReactElement,
    );

    expect(html).toContain("sub=wall-huggers");
    expect(html).toContain("sub=rustic-log");
  });

  it("active sub pill has aria-current='page'", async () => {
    const { CategoryPills } = await vi.importActual<
      typeof import("@/components/shop/CategoryPills")
    >("@/components/shop/CategoryPills");

    const html = renderToStaticMarkup(
      CategoryPills({
        subcategories: STUB_SUBS,
        activeSub: "wall-huggers",
        categorySlug: "futon-frames",
      }) as ReactElement,
    );

    // Exactly one aria-current (the active pill)
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
    // rustic-log pill must NOT be current
    expect(html).not.toMatch(
      /sub=rustic-log[^>]*aria-current|aria-current[^>]*sub=rustic-log/,
    );
  });

  it("All pill has aria-current='page' when activeSub is undefined", async () => {
    const { CategoryPills } = await vi.importActual<
      typeof import("@/components/shop/CategoryPills")
    >("@/components/shop/CategoryPills");

    const html = renderToStaticMarkup(
      CategoryPills({
        subcategories: STUB_SUBS,
        activeSub: undefined,
        categorySlug: "futon-frames",
      }) as ReactElement,
    );

    // Exactly one aria-current, and sub pills are NOT current
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(
      /sub=wall-huggers[^>]*aria-current|aria-current[^>]*sub=wall-huggers/,
    );
    expect(html).not.toMatch(
      /sub=rustic-log[^>]*aria-current|aria-current[^>]*sub=rustic-log/,
    );
  });
});

// ── PlpPage integration ──────────────────────────────────────────────────────

import PlpPage from "@/app/shop/[category]/page";
import { findCategory } from "@/lib/shop/categories";
import { getCollectionBySlug, listProductsOnSale } from "@/lib/wix/products";
import { getCollectionPlp } from "@/lib/wix/plp";

const CATEGORY_WITH_SUBS = {
  slug: "futon-frames",
  name: "Futon Frames",
  description: "Our frames.",
  collectionSlug: "futon-frames",
  subcategories: [
    { slug: "wall-huggers", name: "Wall Huggers", nameContains: "Wall Hugger" },
    { slug: "rustic-log", name: "Rustic Log", nameContains: "Rustic Log" },
  ],
};

const MIXED_PRODUCTS_PLP = {
  page: {
    items: [
      {
        _id: "p1",
        name: "Wall Hugger Lounger",
        slug: "wall-hugger-lounger",
        priceData: { formatted: { price: "$499" } },
      },
      {
        _id: "p2",
        name: "Mission Futon Frame",
        slug: "mission-futon",
        priceData: { formatted: { price: "$399" } },
      },
    ],
    total: 2,
    page: 1,
    pageSize: 24,
    hasNext: false,
    hasPrev: false,
  },
  facets: { total: 2, inStock: 2, outOfStock: 0, priceBuckets: [] },
};

describe("PlpPage — CategoryPills rendering (cfw-dv5)", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue(CATEGORY_WITH_SUBS as any);
    vi.mocked(getCollectionBySlug).mockResolvedValue({
      _id: "futons-col-id",
    } as never);
    vi.mocked(listProductsOnSale).mockResolvedValue([]);
    vi.mocked(getCollectionPlp).mockResolvedValue(MIXED_PRODUCTS_PLP as never);
  });

  it("renders CategoryPills when category has subcategories", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-testid="category-pills"');
  });

  it("CategoryPills appears above the product grid", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    const pillsIdx = html.indexOf('data-testid="category-pills"');
    const gridIdx = html.indexOf("<ul");
    expect(pillsIdx).toBeGreaterThan(-1);
    expect(gridIdx).toBeGreaterThan(-1);
    expect(pillsIdx).toBeLessThan(gridIdx);
  });

  it("does not render CategoryPills when category has no subcategories", async () => {
    vi.mocked(findCategory).mockReturnValue({
      slug: "mattresses",
      name: "Mattresses",
      description: "Futon mattresses.",
      collectionSlug: "mattresses",
    } as any);
    vi.mocked(getCollectionBySlug).mockResolvedValue({
      _id: "mattresses-col-id",
    } as never);

    const tree = (await PlpPage({
      params: Promise.resolve({ category: "mattresses" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).not.toContain('data-testid="category-pills"');
  });
});

describe("PlpPage — sub-category filtering (cfw-dv5)", () => {
  beforeEach(() => {
    vi.mocked(findCategory).mockReturnValue(CATEGORY_WITH_SUBS as any);
    vi.mocked(getCollectionBySlug).mockResolvedValue({
      _id: "futons-col-id",
    } as never);
    vi.mocked(listProductsOnSale).mockResolvedValue([]);
    vi.mocked(getCollectionPlp).mockResolvedValue(MIXED_PRODUCTS_PLP as never);
  });

  it("shows all products when no sub param", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Wall Hugger Lounger");
    expect(html).toContain("Mission Futon Frame");
  });

  it("shows only matching products when sub=wall-huggers", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ sub: "wall-huggers" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Wall Hugger Lounger");
    expect(html).not.toContain("Mission Futon Frame");
  });

  it("shows empty-state when sub matches no products", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ sub: "rustic-log" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    // Neither fixture product contains "Rustic Log"
    expect(html).not.toContain("Wall Hugger Lounger");
    expect(html).not.toContain("Mission Futon Frame");
  });

  it("unknown sub slug falls back to showing all products", async () => {
    const tree = (await PlpPage({
      params: Promise.resolve({ category: "futon-frames" }),
      searchParams: Promise.resolve({ sub: "nonexistent-slug" }),
    })) as ReactElement;
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Wall Hugger Lounger");
    expect(html).toContain("Mission Futon Frame");
  });
});

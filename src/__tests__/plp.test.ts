import { describe, it, expect } from "vitest";
import {
  computeFacets,
  __TEST__,
} from "@/lib/wix/plp";
import type { WixProduct } from "@/lib/wix/products";

const { DEFAULT_PRICE_BUCKETS, effectivePrice, applyFilters, applySort } =
  __TEST__;

// ── effectivePrice ────────────────────────────────────────────────────────────

describe("effectivePrice", () => {
  it("prefers priceRange.minValue when > 0", () => {
    const p = { priceData: { price: 0 }, priceRange: { minValue: 549 } };
    expect(effectivePrice(p)).toBe(549);
  });

  it("falls back to priceData.price when priceRange is absent", () => {
    const p = { priceData: { price: 399 } };
    expect(effectivePrice(p)).toBe(399);
  });

  it("falls back to priceData.price when priceRange.minValue is 0", () => {
    const p = { priceData: { price: 199 }, priceRange: { minValue: 0 } };
    expect(effectivePrice(p)).toBe(199);
  });

  it("returns 0 when both are absent", () => {
    expect(effectivePrice({})).toBe(0);
  });
});

// ── applyFilters ──────────────────────────────────────────────────────────────

function makeProduct(
  id: string,
  price: number,
  inStock: boolean,
): WixProduct {
  return {
    _id: id,
    priceData: { price },
    priceRange: { minValue: price },
    stock: { inStock },
  } as unknown as WixProduct;
}

describe("applyFilters", () => {
  const products = [
    makeProduct("a", 150, true),
    makeProduct("b", 450, true),
    makeProduct("c", 900, false),
    makeProduct("d", 1800, true),
  ];

  it("returns all products when no filters supplied", () => {
    expect(applyFilters(products, {})).toHaveLength(4);
  });

  it("filters by priceMin", () => {
    const result = applyFilters(products, { priceMin: 400 });
    expect(result.map((p) => (p as unknown as { _id: string })._id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("filters by priceMax", () => {
    const result = applyFilters(products, { priceMax: 500 });
    expect(result.map((p) => (p as unknown as { _id: string })._id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("filters by priceMin + priceMax", () => {
    const result = applyFilters(products, { priceMin: 400, priceMax: 1000 });
    expect(result.map((p) => (p as unknown as { _id: string })._id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("filters out-of-stock when inStockOnly=true", () => {
    const result = applyFilters(products, { inStockOnly: true });
    expect(result.map((p) => (p as unknown as { _id: string })._id)).toEqual([
      "a",
      "b",
      "d",
    ]);
  });

  it("combines price + inStock filters", () => {
    const result = applyFilters(products, { priceMin: 400, inStockOnly: true });
    expect(result.map((p) => (p as unknown as { _id: string })._id)).toEqual([
      "b",
      "d",
    ]);
  });
});

// ── applySort ─────────────────────────────────────────────────────────────────

describe("applySort", () => {
  const products = [
    makeProduct("cheap", 100, true),
    makeProduct("expensive", 1000, true),
    makeProduct("mid", 500, true),
  ];

  it("price-asc returns cheapest first", () => {
    const result = applySort(products, "price-asc");
    const prices = result.map(
      (p) => (p as unknown as { priceData: { price: number } }).priceData.price,
    );
    expect(prices).toEqual([100, 500, 1000]);
  });

  it("price-desc returns most expensive first", () => {
    const result = applySort(products, "price-desc");
    const prices = result.map(
      (p) => (p as unknown as { priceData: { price: number } }).priceData.price,
    );
    expect(prices).toEqual([1000, 500, 100]);
  });

  it("featured returns original order", () => {
    expect(applySort(products, "featured")).toBe(products);
  });

  it("name-asc sorts alphabetically", () => {
    const namedProducts = [
      { ...makeProduct("z", 100, true), name: "Zebra" },
      { ...makeProduct("a", 200, true), name: "Apple" },
      { ...makeProduct("m", 300, true), name: "Mango" },
    ] as unknown as WixProduct[];
    const result = applySort(namedProducts, "name-asc");
    expect(
      result.map((p) => (p as unknown as { name: string }).name),
    ).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("throws on unknown sort value", () => {
    expect(() =>
      applySort(products, "unknown" as never),
    ).toThrow("Unknown PlpSort");
  });
});

// ── computeFacets ─────────────────────────────────────────────────────────────

describe("computeFacets", () => {
  const products = [
    makeProduct("a", 150, true),   // bucket: Under $200
    makeProduct("b", 350, true),   // bucket: $200–$500
    makeProduct("c", 700, false),  // bucket: $500–$1,000 (out of stock)
    makeProduct("d", 1500, true),  // bucket: $1,000–$2,000
    makeProduct("e", 2500, true),  // bucket: $2,000+
  ];

  it("counts total, inStock, outOfStock", () => {
    const f = computeFacets(products as unknown as WixProduct[]);
    expect(f.total).toBe(5);
    expect(f.inStock).toBe(4);
    expect(f.outOfStock).toBe(1);
  });

  it("distributes products into default price buckets", () => {
    const f = computeFacets(products as unknown as WixProduct[]);
    const labels = f.priceBuckets.map((b) => b.label);
    expect(labels).toEqual(DEFAULT_PRICE_BUCKETS.map((b) => b.label));

    const counts = f.priceBuckets.map((b) => b.count);
    // Under $200: a, $200-$500: b, $500-$1000: c, $1000-$2000: d, $2000+: e
    expect(counts).toEqual([1, 1, 1, 1, 1]);
  });

  it("returns all-zero facets for empty catalog", () => {
    const f = computeFacets([]);
    expect(f.total).toBe(0);
    expect(f.inStock).toBe(0);
    expect(f.outOfStock).toBe(0);
    expect(f.priceBuckets.every((b) => b.count === 0)).toBe(true);
  });

  it("respects custom price buckets", () => {
    const f = computeFacets(products as unknown as WixProduct[], {
      priceBuckets: [
        { label: "Under $1k", min: 0, max: 1000 },
        { label: "$1k+", min: 1000 },
      ],
    });
    expect(f.priceBuckets[0].count).toBe(3); // a, b, c
    expect(f.priceBuckets[1].count).toBe(2); // d, e
  });
});

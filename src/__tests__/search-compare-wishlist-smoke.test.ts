// Smoke tests: search + compare + wishlist — fixture mode round-trips.
// All three domains exercise the full data path from fixture catalog through
// the public API surface, so a regression anywhere in the chain fails here.
//
// "Smoke" scope: cover the happy path + one meaningful edge case per domain.
// Unit-level edge cases (e.g. exhaustive sort enum) live in plp.test.ts.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  COMPARE_MIN,
  COMPARE_MAX,
  COMPARE_ATTRIBUTES,
  parseCompareSlugs,
  shouldShowEmpty,
  getCompareAttribute,
  buildCompareRow,
  isRowUniform,
  type CompareProduct,
} from "@/lib/product/compare";
import {
  addToWishlist,
  removeFromWishlist,
  isOnWishlist,
  getWishlistTotal,
  makeWishlistItem,
  type WishlistState,
} from "@/lib/wishlist/wishlist-state";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";

// ── Search smoke ──────────────────────────────────────────────────────────────
//
// searchProducts is an async function that imports from @/lib/wix/products.
// We exercise it in fixture mode by forcing the env flag and re-importing
// the module after vi.stubEnv so the module-level USE_FIXTURES const is set.

describe("searchProducts — fixture mode round-trip", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USE_FIXTURE_PRODUCTS", "1");
  });

  it("returns futon-frame products matching 'futon'", async () => {
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("futon");
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      const name = (p as unknown as { name?: string }).name ?? "";
      expect(name.toLowerCase()).toContain("futon");
    }
  });

  it("returns empty array for empty query", async () => {
    const { searchProducts } = await import("@/lib/wix/products");
    expect(await searchProducts("")).toEqual([]);
    expect(await searchProducts("   ")).toEqual([]);
  });

  it("returns empty array for a query with no matching products", async () => {
    const { searchProducts } = await import("@/lib/wix/products");
    const results = await searchProducts("zzz-no-match-xyz");
    expect(results).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    const { searchProducts } = await import("@/lib/wix/products");
    const all = await searchProducts("futon", 999);
    const limited = await searchProducts("futon", 2);
    expect(limited.length).toBeLessThanOrEqual(2);
    expect(limited.length).toBeLessThanOrEqual(all.length);
  });

  it("is case-insensitive", async () => {
    const { searchProducts } = await import("@/lib/wix/products");
    const lower = await searchProducts("kingston");
    const upper = await searchProducts("KINGSTON");
    const mixed = await searchProducts("KiNgStOn");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
    expect(lower.length).toBeGreaterThan(0);
  });
});

// ── Compare smoke ─────────────────────────────────────────────────────────────

describe("compare — fixture mode round-trip", () => {
  // Build minimal CompareProduct objects from fixture data for testing.
  const fixtureAsCompare = FIXTURE_PRODUCTS.map(
    (p): CompareProduct => ({
      _id: p._id,
      slug: p.slug,
      name: p.name,
      inStock: p.stock.inStock,
      priceData: p.priceData,
    }),
  );

  describe("parseCompareSlugs", () => {
    it("parses a comma-separated string", () => {
      const slugs = parseCompareSlugs("kingston-futon-frame,lexington-futon-frame");
      expect(slugs).toEqual([
        "kingston-futon-frame",
        "lexington-futon-frame",
      ]);
    });

    it("handles an array input", () => {
      const slugs = parseCompareSlugs([
        "kingston-futon-frame",
        "lexington-futon-frame",
      ]);
      expect(slugs).toEqual([
        "kingston-futon-frame",
        "lexington-futon-frame",
      ]);
    });

    it("caps at COMPARE_MAX slugs", () => {
      const input = Array.from({ length: 10 }, (_, i) => `slug-${i}`).join(",");
      expect(parseCompareSlugs(input).length).toBe(COMPARE_MAX);
    });

    it("returns empty for undefined/empty", () => {
      expect(parseCompareSlugs(undefined)).toEqual([]);
      expect(parseCompareSlugs("")).toEqual([]);
    });
  });

  describe("shouldShowEmpty", () => {
    it("returns true when fewer than COMPARE_MIN items", () => {
      expect(shouldShowEmpty({ length: 0 })).toBe(true);
      expect(shouldShowEmpty({ length: COMPARE_MIN - 1 })).toBe(true);
    });

    it("returns false when at least COMPARE_MIN items", () => {
      expect(shouldShowEmpty({ length: COMPARE_MIN })).toBe(false);
      expect(shouldShowEmpty({ length: COMPARE_MAX })).toBe(false);
    });
  });

  describe("getCompareAttribute", () => {
    const inStockProduct = fixtureAsCompare.find((p) => p.inStock === true)!;
    const oosProduct = fixtureAsCompare.find((p) => p.inStock === false)!;

    it("returns formatted price", () => {
      const price = getCompareAttribute(inStockProduct, "Price");
      expect(price).toMatch(/^\$/);
    });

    it("returns In Stock / Out of Stock", () => {
      expect(getCompareAttribute(inStockProduct, "In Stock")).toBe("In Stock");
      expect(getCompareAttribute(oosProduct, "In Stock")).toBe("Out of Stock");
    });

    it("returns — for Rating when not set", () => {
      const product: CompareProduct = { name: "Test" };
      expect(getCompareAttribute(product, "Rating")).toBe("—");
    });

    it("returns — for unknown additionalInfoSections attribute", () => {
      const product: CompareProduct = { name: "Test", additionalInfoSections: [] };
      expect(getCompareAttribute(product, "Frame Material")).toBe("—");
    });

    it("reads from additionalInfoSections by title", () => {
      const product: CompareProduct = {
        name: "Test",
        additionalInfoSections: [
          { title: "Frame Material", description: "Solid Oak" },
        ],
      };
      expect(getCompareAttribute(product, "Frame Material")).toBe("Solid Oak");
    });
  });

  describe("buildCompareRow", () => {
    it("builds a row with one value per product", () => {
      const products = fixtureAsCompare.slice(0, COMPARE_MIN);
      const row = buildCompareRow(products, { key: "price", label: "Price" });
      expect(row.label).toBe("Price");
      expect(row.values).toHaveLength(COMPARE_MIN);
      expect(row.values.every((v) => v.startsWith("$"))).toBe(true);
    });

    it("covers all COMPARE_ATTRIBUTES without throwing", () => {
      const products = fixtureAsCompare.slice(0, COMPARE_MIN);
      for (const attr of COMPARE_ATTRIBUTES) {
        expect(() => buildCompareRow(products, attr)).not.toThrow();
      }
    });
  });

  describe("isRowUniform", () => {
    it("returns true when all values are the same", () => {
      expect(isRowUniform(["—", "—", "—"])).toBe(true);
    });

    it("returns false when any value differs", () => {
      expect(isRowUniform(["In Stock", "Out of Stock"])).toBe(false);
    });

    it("returns true for a single-element array", () => {
      expect(isRowUniform(["$399.00"])).toBe(true);
    });
  });
});

// ── Wishlist smoke ────────────────────────────────────────────────────────────

describe("wishlist — fixture mode round-trip", () => {
  const emptyState: WishlistState = { items: [] };

  // Build a wishlist item from the first futon-frame fixture product.
  const futonProduct = FIXTURE_PRODUCTS.find((p) =>
    p.collectionIds.includes("fixture-col-futon-frames"),
  )!;

  const futonItem = makeWishlistItem(
    futonProduct._id,
    futonProduct.name,
    futonProduct.priceData.price,
    futonProduct.slug,
    futonProduct.media.mainMedia.image.url,
    futonProduct.stock.inStock,
  );

  it("starts empty", () => {
    expect(getWishlistTotal(emptyState)).toBe(0);
    expect(isOnWishlist(emptyState, futonProduct._id)).toBe(false);
  });

  it("adds an item and reflects it in isOnWishlist + total", () => {
    const state = addToWishlist(emptyState, futonItem);
    expect(isOnWishlist(state, futonProduct._id)).toBe(true);
    expect(getWishlistTotal(state)).toBe(1);
  });

  it("adding the same product twice is idempotent", () => {
    const once = addToWishlist(emptyState, futonItem);
    const twice = addToWishlist(once, futonItem);
    expect(getWishlistTotal(twice)).toBe(1);
  });

  it("removes an item", () => {
    const withItem = addToWishlist(emptyState, futonItem);
    const removed = removeFromWishlist(withItem, futonProduct._id);
    expect(isOnWishlist(removed, futonProduct._id)).toBe(false);
    expect(getWishlistTotal(removed)).toBe(0);
  });

  it("removing a non-existent item is a no-op", () => {
    const state = addToWishlist(emptyState, futonItem);
    const unchanged = removeFromWishlist(state, "fixture-nonexistent");
    expect(getWishlistTotal(unchanged)).toBe(1);
  });

  it("round-trip: add multiple, remove one, remainder intact", () => {
    // Build a second item from a different fixture product.
    const murphyProduct = FIXTURE_PRODUCTS.find((p) =>
      p.collectionIds.includes("fixture-col-murphy-beds"),
    )!;
    const murphyItem = makeWishlistItem(
      murphyProduct._id,
      murphyProduct.name,
      murphyProduct.priceData.price,
      murphyProduct.slug,
    );

    let state = addToWishlist(emptyState, futonItem);
    state = addToWishlist(state, murphyItem);
    expect(getWishlistTotal(state)).toBe(2);

    state = removeFromWishlist(state, futonProduct._id);
    expect(getWishlistTotal(state)).toBe(1);
    expect(isOnWishlist(state, murphyProduct._id)).toBe(true);
    expect(isOnWishlist(state, futonProduct._id)).toBe(false);
  });

  it("makeWishlistItem captures priceAtAdd correctly", () => {
    expect(futonItem.priceAtAdd).toBe(futonProduct.priceData.price);
    expect(futonItem.productSlug).toBe(futonProduct.slug);
    expect(futonItem.inStock).toBe(futonProduct.stock.inStock);
  });
});

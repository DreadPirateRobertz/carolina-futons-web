// Unit tests for the config-driven derived-category resolver (cf-3qt.6.D.F3).
// Replaces the two hard-coded `if slug === "mattresses-sale"` branches that
// used to live in src/app/shop/[category]/page.tsx.

import { describe, it, expect, vi, beforeEach } from "vitest";

const wixMock = vi.hoisted(() => ({
  getCollectionBySlug: vi.fn(),
  listProductsOnSale: vi.fn(),
}));
vi.mock("@/lib/wix/products", () => wixMock);

import type { ShopCategory } from "@/lib/shop/categories";
import { resolveDerivedProducts } from "@/lib/shop/derived-products";

beforeEach(() => {
  vi.clearAllMocks();
});

const regular: ShopCategory = {
  slug: "futon-frames",
  name: "Futon Frames",
  description: "",
  collectionSlug: "futon-frames",
};

const derived: ShopCategory = {
  slug: "mattresses-sale",
  name: "Mattresses on Sale",
  description: "",
  collectionSlug: "mattresses-sale",
  sourceSlug: "mattresses",
  filter: "on-sale",
  emptyStateCopy: "No mattresses on sale.",
};

describe("resolveDerivedProducts", () => {
  it("returns undefined for a non-derived category (no filter)", async () => {
    const result = await resolveDerivedProducts(regular);
    expect(result).toBeUndefined();
    // Regular categories must not trigger the source-collection lookup.
    expect(wixMock.getCollectionBySlug).not.toHaveBeenCalled();
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
  });

  it("sources from sourceSlug when set (not the category's own collectionSlug)", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-123" });
    wixMock.listProductsOnSale.mockResolvedValue([{ _id: "p1" }]);

    await resolveDerivedProducts(derived);

    expect(wixMock.getCollectionBySlug).toHaveBeenCalledWith("mattresses");
    expect(wixMock.listProductsOnSale).toHaveBeenCalledWith("coll-123");
  });

  it("falls back to collectionSlug when sourceSlug is omitted", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-456" });
    wixMock.listProductsOnSale.mockResolvedValue([]);
    const derivedNoSource: ShopCategory = {
      ...derived,
      sourceSlug: undefined,
    };

    await resolveDerivedProducts(derivedNoSource);

    expect(wixMock.getCollectionBySlug).toHaveBeenCalledWith(
      "mattresses-sale",
    );
  });

  it("dispatches the 'on-sale' filter through listProductsOnSale", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-x" });
    const expected = [{ _id: "p1" }, { _id: "p2" }];
    wixMock.listProductsOnSale.mockResolvedValue(expected);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual(expected);
  });

  it("returns [] when the source collection is missing (data state, not error)", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue(null);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual([]);
    // Predicate never runs — nothing to filter.
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
  });

  it("returns [] when the source collection has no _id", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({});

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual([]);
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
  });
});

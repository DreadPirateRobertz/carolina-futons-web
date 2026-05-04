import { describe, it, expect } from "vitest";
import {
  FIXTURE_PRODUCTS,
  getFixtureProductBySlug,
} from "@/lib/fixtures/products";
import {
  FIXTURE_COLLECTIONS,
  getFixtureCollectionBySlug,
} from "@/lib/fixtures/collections";

describe("fixture products", () => {
  it("exports 7 products", () => {
    expect(FIXTURE_PRODUCTS).toHaveLength(7);
  });

  it("all products have required PDP fields", () => {
    for (const p of FIXTURE_PRODUCTS) {
      expect(p._id).toMatch(/^fixture-/);
      expect(typeof p.slug).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(typeof (p as { priceData?: { price: number } }).priceData?.price).toBe("number");
      expect(Array.isArray((p as { collectionIds?: unknown[] }).collectionIds)).toBe(true);
      expect(Array.isArray((p as { productOptions?: unknown[] }).productOptions)).toBe(true);
      expect(Array.isArray((p as { variants?: unknown[] }).variants)).toBe(true);
    }
  });

  it("getFixtureProductBySlug returns matching product", () => {
    const product = getFixtureProductBySlug("kingston-futon-frame");
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Kingston Futon Frame");
  });

  it("getFixtureProductBySlug returns null for unknown slug", () => {
    expect(getFixtureProductBySlug("nonexistent-product")).toBeNull();
  });

  it("monterey platform bed price is above white-glove threshold ($1500)", () => {
    const monterey = getFixtureProductBySlug("monterey-platform-bed");
    expect(monterey).not.toBeNull();
    const price = (monterey as { priceData?: { price: number } }).priceData?.price ?? 0;
    expect(price).toBeGreaterThanOrEqual(1500);
  });

  it("sedona futon frame is out-of-stock", () => {
    const sedona = getFixtureProductBySlug("sedona-futon-frame-oos");
    expect(sedona).not.toBeNull();
    const stock = (sedona as { stock?: { inStock: boolean; trackInventory: boolean } }).stock;
    expect(stock?.inStock).toBe(false);
    expect(stock?.trackInventory).toBe(true);
  });

  it("all in-stock products have inStock=true", () => {
    const inStockSlugs = [
      "kingston-futon-frame",
      "asheville-murphy-bed",
      "cube-murphy-cabinet-bed",
      "ranchero-murphy-cabinet-bed",
      "mesa-foam-mattress",
      "monterey-platform-bed",
    ];
    for (const slug of inStockSlugs) {
      const p = getFixtureProductBySlug(slug);
      const stock = (p as { stock?: { inStock: boolean } }).stock;
      expect(stock?.inStock).toBe(true);
    }
  });
});

describe("fixture collections", () => {
  it("exports 5 collections", () => {
    expect(FIXTURE_COLLECTIONS).toHaveLength(5);
  });

  it("getFixtureCollectionBySlug returns matching collection", () => {
    const col = getFixtureCollectionBySlug("futon-frames");
    expect(col).not.toBeNull();
    expect(col!.name).toBe("Futon Frames");
  });

  it("getFixtureCollectionBySlug returns null for unknown slug", () => {
    expect(getFixtureCollectionBySlug("nonexistent-collection")).toBeNull();
  });

  it("all fixture product collectionIds reference valid fixture collections", () => {
    const collectionIds = new Set(FIXTURE_COLLECTIONS.map((c) => c._id));
    for (const p of FIXTURE_PRODUCTS) {
      const ids = (p as { collectionIds?: string[] }).collectionIds ?? [];
      for (const id of ids) {
        expect(collectionIds.has(id)).toBe(true);
      }
    }
  });
});

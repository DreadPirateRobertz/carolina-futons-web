// Unit tests for the config-driven derived-category resolver (cf-3qt.6.D.F3).
// Replaces the two hard-coded `if slug === "mattresses-sale"` branches that
// used to live in src/app/shop/[category]/page.tsx.

import { describe, it, expect, vi, beforeEach } from "vitest";

const wixMock = vi.hoisted(() => ({
  getCollectionBySlug: vi.fn(),
  listProductsOnSale: vi.fn(),
}));
vi.mock("@/lib/wix/products", () => wixMock);

const errorsMock = vi.hoisted(() => ({
  logWixFailure: vi.fn(async (_source: string, _op: string, _err: unknown) => {}),
  toReaderError: vi.fn((err: unknown) => {
    if (
      typeof err === "object" &&
      err !== null &&
      typeof (err as { code?: unknown }).code === "string"
    ) {
      return "wix_sdk" as const;
    }
    return "unexpected" as const;
  }),
}));
vi.mock("@/lib/wix/errors", () => errorsMock);

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

describe("resolveDerivedProducts — happy path", () => {
  it("returns undefined for a non-derived category (no filter)", async () => {
    const result = await resolveDerivedProducts(regular);
    expect(result).toBeUndefined();
    // Regular categories must not trigger the source-collection lookup.
    expect(wixMock.getCollectionBySlug).not.toHaveBeenCalled();
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
    expect(errorsMock.logWixFailure).not.toHaveBeenCalled();
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

  it("dispatches the 'on-sale' filter through listProductsOnSale and returns {items}", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-x" });
    const expected = [{ _id: "p1" }, { _id: "p2" }];
    wixMock.listProductsOnSale.mockResolvedValue(expected);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: expected });
    expect(result?.error).toBeUndefined();
    expect(errorsMock.logWixFailure).not.toHaveBeenCalled();
  });

  it("returns {items: []} (no error) when source collection is present but has zero on-sale items", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-empty" });
    wixMock.listProductsOnSale.mockResolvedValue([]);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: [] });
    expect(result?.error).toBeUndefined();
    expect(errorsMock.logWixFailure).not.toHaveBeenCalled();
  });
});

describe("resolveDerivedProducts — error path (cf-3qt.6.D.F3 silent-failure fix)", () => {
  it("tags missing source collection as error: 'unexpected' AND logs to Sentry (NOT silent [])", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue(null);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: [], error: "unexpected" });
    // Predicate never runs — nothing to filter.
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
    // Critical: log fired so a config typo / deleted Wix collection surfaces
    // in Sentry instead of rendering an empty PLP forever.
    expect(errorsMock.logWixFailure).toHaveBeenCalledWith(
      "derived-products",
      expect.stringContaining("mattresses-sale"),
      expect.any(Error),
    );
  });

  it("tags source-collection-missing-_id as error: 'unexpected' + logs", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({});

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: [], error: "unexpected" });
    expect(wixMock.listProductsOnSale).not.toHaveBeenCalled();
    expect(errorsMock.logWixFailure).toHaveBeenCalledTimes(1);
  });

  it("tags unknown filter as error: 'unexpected' + logs (defensive guard for TS-bypass path)", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-y" });
    const bogus = {
      ...derived,
      filter: "future-filter-not-yet-wired",
    } as unknown as ShopCategory;

    const result = await resolveDerivedProducts(bogus);

    expect(result).toEqual({ items: [], error: "unexpected" });
    expect(errorsMock.logWixFailure).toHaveBeenCalledWith(
      "derived-products",
      expect.stringContaining("mattresses-sale"),
      expect.any(Error),
    );
    const loggedError = errorsMock.logWixFailure.mock.calls[0][2] as Error;
    expect(loggedError.message).toContain("unknown filter");
  });

  it("catches an unexpected throw inside the reader and tags it ('unexpected' for non-Wix throws)", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-z" });
    wixMock.listProductsOnSale.mockRejectedValue(new Error("network down"));

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: [], error: "unexpected" });
    expect(errorsMock.logWixFailure).toHaveBeenCalled();
  });

  it("translates a Wix-shaped throw inside the reader into error: 'wix_sdk'", async () => {
    wixMock.getCollectionBySlug.mockResolvedValue({ _id: "coll-z" });
    const wixErr = Object.assign(new Error("rate limited"), {
      code: "RATE_LIMIT",
    });
    wixMock.listProductsOnSale.mockRejectedValue(wixErr);

    const result = await resolveDerivedProducts(derived);

    expect(result).toEqual({ items: [], error: "wix_sdk" });
  });
});

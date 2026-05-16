// cf-8xw2 (cf-g640.fu2): tests for the Promise.allSettled isolation of
// PDP catalog fetches. Each of the 4 underlying calls is mocked
// independently so we can pin (a) the success path returns the right
// values + (b) any single rejection isolates — the other 3 still
// resolve to their fetched values, the rejected one returns the safe
// default, and a Sentry breadcrumb fires naming the specific source.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getCrossSellProducts = vi.fn();
const getAlsoBoughtProducts = vi.fn();
const getProductBadges = vi.fn();
const getCollectionBySlug = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/product/cross-sell", () => ({
  getCrossSellProducts: (...args: unknown[]) => getCrossSellProducts(...args),
}));
vi.mock("@/lib/product/also-bought", () => ({
  getAlsoBoughtProducts: (...args: unknown[]) => getAlsoBoughtProducts(...args),
}));
vi.mock("@/lib/wix/product-badges", () => ({
  getProductBadges: (...args: unknown[]) => getProductBadges(...args),
}));
vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: (...args: unknown[]) => getCollectionBySlug(...args),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

const fakeProduct = { _id: "p-1", slug: "kingston-futon-frame" } as never;
const SLUG = "kingston-futon-frame";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("loadPdpCatalogSafely — happy path", () => {
  it("returns each call's value when all four resolve", async () => {
    // cross-sell + also-bought return { items, error? } envelopes;
    // product-badges + getCollectionBySlug return their own native shapes.
    getCrossSellProducts.mockResolvedValueOnce({ items: [{ _id: "cs-1" }] });
    getAlsoBoughtProducts.mockResolvedValueOnce({
      items: [{ _id: "ab-1" }],
      source: "cms",
    });
    getProductBadges.mockResolvedValueOnce([{ slug: SLUG, badge: "new" }]);
    getCollectionBySlug.mockResolvedValueOnce({ _id: "mattresses-col" });

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result.crossSell).toEqual({ items: [{ _id: "cs-1" }] });
    expect(result.alsoBought).toEqual({
      items: [{ _id: "ab-1" }],
      source: "cms",
    });
    expect(result.productBadges).toEqual([{ slug: SLUG, badge: "new" }]);
    expect(result.mattressesCollection).toEqual({ _id: "mattresses-col" });
    expect(logWixFailure).not.toHaveBeenCalled();
  });
});

describe("loadPdpCatalogSafely — failure isolation (cf-8xw2)", () => {
  it("cross-sell rejection does NOT cascade — others still resolve, cross-sell defaults to { items: [] }", async () => {
    const err = new Error("cross-sell down");
    getCrossSellProducts.mockRejectedValueOnce(err);
    getAlsoBoughtProducts.mockResolvedValueOnce({ items: [{ _id: "ab-1" }] });
    getProductBadges.mockResolvedValueOnce([{ slug: SLUG, badge: "new" }]);
    getCollectionBySlug.mockResolvedValueOnce({ _id: "mattresses-col" });

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result.crossSell).toEqual({ items: [] });
    expect(result.alsoBought).toEqual({ items: [{ _id: "ab-1" }] });
    expect(result.productBadges).toEqual([{ slug: SLUG, badge: "new" }]);
    expect(result.mattressesCollection).toEqual({ _id: "mattresses-col" });
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp-crossSell",
      `PDP slug=${SLUG}`,
      err,
    );
  });

  it("also-bought rejection isolates", async () => {
    const err = new Error("also-bought down");
    getCrossSellProducts.mockResolvedValueOnce({ items: [] });
    getAlsoBoughtProducts.mockRejectedValueOnce(err);
    getProductBadges.mockResolvedValueOnce([]);
    getCollectionBySlug.mockResolvedValueOnce(null);

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result.alsoBought).toEqual({ items: [] });
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp-alsoBought",
      `PDP slug=${SLUG}`,
      err,
    );
  });

  it("badges rejection isolates", async () => {
    const err = new Error("badges down");
    getCrossSellProducts.mockResolvedValueOnce({ items: [] });
    getAlsoBoughtProducts.mockResolvedValueOnce({ items: [] });
    getProductBadges.mockRejectedValueOnce(err);
    getCollectionBySlug.mockResolvedValueOnce(null);

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result.productBadges).toEqual([]);
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp-productBadges",
      `PDP slug=${SLUG}`,
      err,
    );
  });

  it("mattresses-collection rejection isolates — cf-g640 warranty gate fails closed (no warranty surfaced) without cascading", async () => {
    const err = new Error("collection lookup down");
    getCrossSellProducts.mockResolvedValueOnce({ items: [{ _id: "cs-1" }] });
    getAlsoBoughtProducts.mockResolvedValueOnce({ items: [{ _id: "ab-1" }] });
    getProductBadges.mockResolvedValueOnce([]);
    getCollectionBySlug.mockRejectedValueOnce(err);

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result.mattressesCollection).toBeNull();
    // Other three still resolve — the warranty gate's failure mode is
    // now independent of the cross-sell carousel's.
    expect(result.crossSell).toEqual({ items: [{ _id: "cs-1" }] });
    expect(result.alsoBought).toEqual({ items: [{ _id: "ab-1" }] });
    expect(logWixFailure).toHaveBeenCalledWith(
      "pdp-mattressesCollection",
      `PDP slug=${SLUG}`,
      err,
    );
  });

  it("all four rejecting returns the EMPTY default tuple + four Sentry tags", async () => {
    const e1 = new Error("a");
    const e2 = new Error("b");
    const e3 = new Error("c");
    const e4 = new Error("d");
    getCrossSellProducts.mockRejectedValueOnce(e1);
    getAlsoBoughtProducts.mockRejectedValueOnce(e2);
    getProductBadges.mockRejectedValueOnce(e3);
    getCollectionBySlug.mockRejectedValueOnce(e4);

    const { loadPdpCatalogSafely } = await import(
      "@/lib/product/pdp-catalog-load"
    );
    const result = await loadPdpCatalogSafely(fakeProduct, SLUG);

    expect(result).toEqual({
      crossSell: { items: [] },
      alsoBought: { items: [] },
      productBadges: [],
      mattressesCollection: null,
    });
    expect(logWixFailure).toHaveBeenCalledTimes(4);
  });
});

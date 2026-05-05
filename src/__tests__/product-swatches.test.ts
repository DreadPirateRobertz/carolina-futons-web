import { describe, it, expect, vi, beforeEach } from "vitest";

const listCollectionItems = vi.fn();
const queryCollectionWhere = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listCollectionItems(...args),
  queryCollectionWhere: (...args: unknown[]) => queryCollectionWhere(...args),
}));

const logWixFailure = vi.fn();
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import {
  getProductSwatches,
  listAllProductSwatches,
} from "@/lib/wix/product-swatches";

beforeEach(() => {
  listCollectionItems.mockReset();
  queryCollectionWhere.mockReset();
  logWixFailure.mockReset();
});

describe("getProductSwatches", () => {
  it("returns parsed swatches for a known slug", async () => {
    queryCollectionWhere.mockResolvedValue([
      {
        productSlug: "rio-futon",
        swatches: [
          { name: "Slate Grey", hex: "#5A5F66" },
          { name: "Sand", hex: "#D9C9A6" },
        ],
      },
    ]);
    const result = await getProductSwatches("rio-futon");
    expect(result).toEqual([
      { name: "Slate Grey", hex: "#5A5F66" },
      { name: "Sand", hex: "#D9C9A6" },
    ]);
  });

  it("queries the ProductSwatches collection on the productSlug field", async () => {
    queryCollectionWhere.mockResolvedValue([]);
    await getProductSwatches("rio-futon");
    expect(queryCollectionWhere).toHaveBeenCalledWith(
      "ProductSwatches",
      "productSlug",
      "rio-futon",
      1,
    );
  });

  it("returns [] when no row exists", async () => {
    queryCollectionWhere.mockResolvedValue([]);
    expect(await getProductSwatches("nonexistent")).toEqual([]);
  });

  it("returns [] and logs when the fetch throws", async () => {
    queryCollectionWhere.mockRejectedValue(new Error("network down"));
    expect(await getProductSwatches("rio-futon")).toEqual([]);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-cms",
      "getProductSwatches(rio-futon)",
      expect.any(Error),
    );
  });

  it("drops swatches missing a name", async () => {
    queryCollectionWhere.mockResolvedValue([
      {
        productSlug: "x",
        swatches: [
          { name: "", hex: "#AABBCC" },
          { name: "Good", hex: "#112233" },
        ],
      },
    ]);
    expect(await getProductSwatches("x")).toEqual([
      { name: "Good", hex: "#112233" },
    ]);
  });

  it("drops swatches with malformed hex codes", async () => {
    queryCollectionWhere.mockResolvedValue([
      {
        productSlug: "x",
        swatches: [
          { name: "BadHex", hex: "blue" },
          { name: "ShortHex", hex: "#abc" },
          { name: "LongHex", hex: "#aabbccdd" },
          { name: "GoodHex", hex: "#aabbcc" },
        ],
      },
    ]);
    expect(await getProductSwatches("x")).toEqual([
      { name: "GoodHex", hex: "#aabbcc" },
    ]);
  });

  it("returns [] when swatches field is not an array", async () => {
    queryCollectionWhere.mockResolvedValue([
      { productSlug: "x", swatches: "not-an-array" },
    ]);
    expect(await getProductSwatches("x")).toEqual([]);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["plain object", {}],
    ["number", 42],
  ])("returns [] when swatches field is %s", async (_label, value) => {
    queryCollectionWhere.mockResolvedValue([
      { productSlug: "x", swatches: value },
    ]);
    expect(await getProductSwatches("x")).toEqual([]);
  });

  it("trims whitespace from name and hex before validating", async () => {
    queryCollectionWhere.mockResolvedValue([
      {
        productSlug: "x",
        swatches: [{ name: "  Padded  ", hex: "  #AABBCC  " }],
      },
    ]);
    expect(await getProductSwatches("x")).toEqual([
      { name: "Padded", hex: "#AABBCC" },
    ]);
  });
});

describe("listAllProductSwatches", () => {
  it("returns a slug→swatches map", async () => {
    listCollectionItems.mockResolvedValue([
      {
        productSlug: "rio-futon",
        swatches: [{ name: "Slate", hex: "#5A5F66" }],
      },
      {
        productSlug: "mesa-mattress",
        swatches: [{ name: "Cream", hex: "#F4E9D6" }],
      },
    ]);
    const map = await listAllProductSwatches();
    expect(map.size).toBe(2);
    expect(map.get("rio-futon")).toEqual([{ name: "Slate", hex: "#5A5F66" }]);
    expect(map.get("mesa-mattress")).toEqual([
      { name: "Cream", hex: "#F4E9D6" },
    ]);
  });

  it("requests up to 500 rows from the ProductSwatches collection", async () => {
    listCollectionItems.mockResolvedValue([]);
    await listAllProductSwatches();
    expect(listCollectionItems).toHaveBeenCalledWith("ProductSwatches", 500);
  });

  it("skips rows without a productSlug", async () => {
    listCollectionItems.mockResolvedValue([
      { productSlug: "", swatches: [{ name: "X", hex: "#000000" }] },
      { swatches: [{ name: "Y", hex: "#111111" }] },
      {
        productSlug: "ok",
        swatches: [{ name: "Z", hex: "#222222" }],
      },
    ]);
    const map = await listAllProductSwatches();
    expect(map.size).toBe(1);
    expect(map.get("ok")).toEqual([{ name: "Z", hex: "#222222" }]);
  });

  it("keeps rows with productSlug even when every swatch is malformed (downstream filters)", async () => {
    // Per-row visibility for malformed swatches comes from parseSwatch's
    // console.warn — pre-filtering at this layer hides "all swatches dropped"
    // outages from the all-rows-dropped warning below. Consumers
    // (enrich-colors.ts) re-check for empty arrays.
    listCollectionItems.mockResolvedValue([
      { productSlug: "all-bad", swatches: [{ name: "", hex: "blue" }] },
      { productSlug: "good", swatches: [{ name: "OK", hex: "#abcdef" }] },
    ]);
    const map = await listAllProductSwatches();
    expect(map.get("all-bad")).toEqual([]);
    expect(map.get("good")).toEqual([{ name: "OK", hex: "#abcdef" }]);
  });

  it("last-write-wins on duplicate productSlug rows (Wix doesn't enforce uniqueness)", async () => {
    listCollectionItems.mockResolvedValue([
      { productSlug: "rio", swatches: [{ name: "Old", hex: "#111111" }] },
      { productSlug: "rio", swatches: [{ name: "New", hex: "#222222" }] },
    ]);
    const map = await listAllProductSwatches();
    expect(map.size).toBe(1);
    expect(map.get("rio")).toEqual([{ name: "New", hex: "#222222" }]);
  });

  it("logs an all-rows-dropped warning when productSlug is missing on every row", async () => {
    // Triggered if a content editor renames the productSlug field or wipes
    // the column — without this signal the home grid silently shows zero
    // swatches with no log trail.
    listCollectionItems.mockResolvedValue([
      { swatches: [{ name: "X", hex: "#000000" }] },
      { productSlug: "", swatches: [{ name: "Y", hex: "#111111" }] },
    ]);
    const map = await listAllProductSwatches();
    expect(map.size).toBe(0);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-cms",
      "listAllProductSwatches",
      expect.objectContaining({
        message: expect.stringContaining("every row was dropped"),
      }),
    );
  });

  it("does not fire the all-rows-dropped warning when the collection is genuinely empty", async () => {
    listCollectionItems.mockResolvedValue([]);
    await listAllProductSwatches();
    expect(logWixFailure).not.toHaveBeenCalled();
  });

  it("returns an empty map and logs when the fetch throws", async () => {
    listCollectionItems.mockRejectedValue(new Error("CMS unreachable"));
    const map = await listAllProductSwatches();
    expect(map.size).toBe(0);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-cms",
      "listAllProductSwatches",
      expect.any(Error),
    );
  });
});

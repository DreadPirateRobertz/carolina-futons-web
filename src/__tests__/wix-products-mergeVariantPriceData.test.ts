import { describe, expect, it } from "vitest";

import { mergeVariantPriceData } from "@/lib/wix/products";
import type { WixProduct } from "@/lib/wix/products";

// cfw-cus: getProduct(_id) returns variants WITHOUT variant.priceData populated
// (Wix SDK NonNullablePaths confirm: getProduct guarantees variant.weight/sku/
// visible but NOT priceData; queryProductVariants is the API path that does).
// Without this merge, the PDP price stays stuck at the product-level fallback
// across every size/variant selection (Stilgar repro: Kingston Twin/Full/
// Queen/King all $619 instead of $619/$719/$719/$819).

function variantWithPrice(id: string, price: number): {
  _id: string;
  variant: { priceData: { price: number; currency: string } };
} {
  return { _id: id, variant: { priceData: { price, currency: "USD" } } };
}

function product(variants: unknown[]): WixProduct {
  return { _id: "p1", slug: "p1", variants } as unknown as WixProduct;
}

describe("mergeVariantPriceData (cfw-cus)", () => {
  it("merges priceData by variant _id from queryProductVariants response", () => {
    const p = product([
      { _id: "v1", choices: { Size: "Twin" }, variant: {} },
      { _id: "v2", choices: { Size: "Queen" }, variant: {} },
      { _id: "v3", choices: { Size: "King" }, variant: {} },
    ]);
    const variantsWithPrice = [
      variantWithPrice("v1", 619),
      variantWithPrice("v2", 719),
      variantWithPrice("v3", 819),
    ];
    const merged = mergeVariantPriceData(p, variantsWithPrice);
    const prices = merged.variants?.map(
      (v: unknown) =>
        (v as { variant?: { priceData?: { price?: number } } }).variant?.priceData?.price,
    );
    expect(prices).toEqual([619, 719, 819]);
  });

  it("preserves existing variant fields (weight, sku, choices)", () => {
    const p = product([
      {
        _id: "v1",
        choices: { Size: "Twin" },
        variant: { weight: 50, sku: "K-T" },
      },
    ]);
    const merged = mergeVariantPriceData(p, [variantWithPrice("v1", 619)]);
    const v = merged.variants?.[0] as {
      _id: string;
      choices: { Size: string };
      variant: { weight: number; sku: string; priceData: { price: number } };
    };
    expect(v._id).toBe("v1");
    expect(v.choices.Size).toBe("Twin");
    expect(v.variant.weight).toBe(50);
    expect(v.variant.sku).toBe("K-T");
    expect(v.variant.priceData.price).toBe(619);
  });

  it("returns the product unchanged when queryProductVariants response is null", () => {
    const p = product([{ _id: "v1", variant: {} }]);
    expect(mergeVariantPriceData(p, null)).toBe(p);
  });

  it("returns the product unchanged when queryProductVariants response is empty", () => {
    const p = product([{ _id: "v1", variant: {} }]);
    expect(mergeVariantPriceData(p, [])).toBe(p);
  });

  it("returns the product unchanged when product has no variants (manageVariants=false)", () => {
    const p = product([]);
    expect(
      mergeVariantPriceData(p, [variantWithPrice("v1", 619)]),
    ).toBe(p);
  });

  it("leaves a variant untouched when no matching _id in the priceData response", () => {
    const p = product([
      { _id: "v1", variant: {} },
      { _id: "v2", variant: {} },
    ]);
    const merged = mergeVariantPriceData(p, [variantWithPrice("v1", 619)]);
    const prices = merged.variants?.map(
      (v: unknown) =>
        (v as { variant?: { priceData?: { price?: number } } }).variant?.priceData?.price,
    );
    expect(prices).toEqual([619, undefined]);
  });

  it("ignores response entries missing _id or priceData", () => {
    const p = product([{ _id: "v1", variant: {} }]);
    const merged = mergeVariantPriceData(p, [
      { variant: { priceData: { price: 999, currency: "USD" } } },
      { _id: "v1", variant: null },
      { _id: "v1", variant: {} },
      variantWithPrice("v1", 619),
    ]);
    const v = merged.variants?.[0] as {
      variant: { priceData: { price: number } };
    };
    expect(v.variant.priceData.price).toBe(619);
  });
});

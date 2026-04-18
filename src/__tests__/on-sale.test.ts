import { describe, it, expect } from "vitest";
import { isProductOnSale } from "@/lib/product/on-sale";

describe("isProductOnSale", () => {
  it("returns true when discountedPrice is below price", () => {
    expect(
      isProductOnSale({
        priceData: { price: 1000, discountedPrice: 799 },
      }),
    ).toBe(true);
  });

  it("returns false when discountedPrice equals price", () => {
    expect(
      isProductOnSale({
        priceData: { price: 1000, discountedPrice: 1000 },
      }),
    ).toBe(false);
  });

  it("returns false when discountedPrice is absent", () => {
    expect(isProductOnSale({ priceData: { price: 1000 } })).toBe(false);
  });

  it("returns false when price is 0 (manageVariants product — variant-priced at root)", () => {
    expect(
      isProductOnSale({
        priceData: { price: 0, discountedPrice: 499 },
      }),
    ).toBe(false);
  });

  it("returns false when discountedPrice is 0", () => {
    expect(
      isProductOnSale({
        priceData: { price: 1000, discountedPrice: 0 },
      }),
    ).toBe(false);
  });

  it("returns false for products without priceData", () => {
    expect(isProductOnSale({})).toBe(false);
    expect(isProductOnSale({ priceData: null })).toBe(false);
  });

  it("rejects non-numeric price/discount values", () => {
    expect(
      isProductOnSale({
        priceData: {
          price: 1000,
          discountedPrice: null as unknown as number,
        },
      }),
    ).toBe(false);
  });
});

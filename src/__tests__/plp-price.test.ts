// cf-24q: PLP price formatting — variant-priced products ($0.00 bug).
// Futon frames use a fixed base price and render correctly. Mattresses enable
// manageVariants with per-variant prices, so the base priceData.formatted.price
// comes back as "$0.00". We need to fall back to Wix's numeric priceRange and
// format a range string ("From $X" or "$X – $Y") instead of echoing "$0.00".

import { describe, it, expect } from "vitest";
import { formatPlpPrice } from "@/lib/product/plp-price";

describe("formatPlpPrice", () => {
  it("returns base formatted price for fixed-price products", () => {
    const product = {
      priceData: {
        price: 499,
        currency: "USD",
        formatted: { price: "$499.00" },
      },
    };
    expect(formatPlpPrice(product)).toBe("$499.00");
  });

  it("returns empty string when no price info is present", () => {
    expect(formatPlpPrice({})).toBe("");
    expect(formatPlpPrice({ priceData: null, priceRange: null })).toBe("");
  });

  it("returns 'From $min' when base price is $0 and variants span a range", () => {
    const product = {
      priceData: {
        price: 0,
        currency: "USD",
        formatted: { price: "$0.00" },
      },
      priceRange: { minValue: 199, maxValue: 699 },
    };
    expect(formatPlpPrice(product)).toBe("From $199");
  });

  it("returns a single price when min equals max", () => {
    const product = {
      priceData: {
        price: 0,
        currency: "USD",
        formatted: { price: "$0.00" },
      },
      priceRange: { minValue: 499, maxValue: 499 },
    };
    expect(formatPlpPrice(product)).toBe("$499");
  });

  it("prefers variant range over base when base is $0 even if formatted is present", () => {
    // Repro of the /shop/mattresses bug: Wix returns priceData.formatted.price
    // as "$0.00" because manageVariants is true, but priceRange has the real
    // spread. Current code rendered "$0.00"; fix shows "From $199".
    const product = {
      priceData: {
        price: 0,
        currency: "USD",
        formatted: { price: "$0.00" },
      },
      priceRange: { minValue: 199, maxValue: 1099 },
    };
    expect(formatPlpPrice(product)).not.toBe("$0.00");
    expect(formatPlpPrice(product)).toContain("From");
    expect(formatPlpPrice(product)).toContain("$199");
  });

  it("falls back to base formatted price when priceRange is absent", () => {
    const product = {
      priceData: {
        price: 349,
        currency: "USD",
        formatted: { price: "$349.00" },
      },
      priceRange: null,
    };
    expect(formatPlpPrice(product)).toBe("$349.00");
  });

  it("ignores priceRange when max is 0 or missing", () => {
    const product = {
      priceData: {
        price: 349,
        currency: "USD",
        formatted: { price: "$349.00" },
      },
      priceRange: { minValue: 0, maxValue: 0 },
    };
    expect(formatPlpPrice(product)).toBe("$349.00");
  });

  it("formats decimal variant prices with cents", () => {
    const product = {
      priceData: {
        price: 0,
        currency: "USD",
        formatted: { price: "$0.00" },
      },
      priceRange: { minValue: 199.95, maxValue: 199.95 },
    };
    expect(formatPlpPrice(product)).toBe("$199.95");
  });

  it("defaults to USD when currency is missing", () => {
    const product = {
      priceData: {
        price: 0,
        formatted: { price: "$0.00" },
      },
      priceRange: { minValue: 250, maxValue: 250 },
    };
    expect(formatPlpPrice(product)).toBe("$250");
  });

  it("returns empty string when base price is $0 with no usable range (Mesa mattress regression — cf-3qt.6.C)", () => {
    // Wix Studio→Headless catalog migration pending: Mesa line has priceData.price=0
    // and priceRange not yet populated. Must show nothing rather than "$0.00".
    expect(
      formatPlpPrice({
        priceData: { price: 0, currency: "USD", formatted: { price: "$0.00" } },
        priceRange: { minValue: 0, maxValue: 0 },
      }),
    ).toBe("");
  });

  it("returns empty string when base price is $0 with null priceRange", () => {
    expect(
      formatPlpPrice({
        priceData: { price: 0, currency: "USD", formatted: { price: "$0.00" } },
        priceRange: null,
      }),
    ).toBe("");
  });

  it("returns empty string when price is null with no usable range", () => {
    expect(
      formatPlpPrice({
        priceData: { price: null, currency: "USD", formatted: { price: null } },
      }),
    ).toBe("");
  });

  it("honors formatted string when numeric price is absent (partial catalog payload)", () => {
    // Partial Wix payload / test fixture: formatted is populated but numeric
    // price is absent. Distinct from manageVariants price===0 — here we don't
    // know it's a $0 placeholder, so trust the formatted string.
    expect(
      formatPlpPrice({
        priceData: { formatted: { price: "$199" } },
      }),
    ).toBe("$199");
  });

  it("falls back to formatCurrency when price is set but formatted is null", () => {
    // Wix should always populate formatted, but if it doesn't, don't silently
    // drop a real price — format it from the numeric value.
    expect(
      formatPlpPrice({
        priceData: { price: 499, currency: "USD", formatted: null },
      }),
    ).toBe("$499");
  });
});

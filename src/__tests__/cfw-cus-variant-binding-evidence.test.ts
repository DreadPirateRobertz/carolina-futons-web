import { describe, expect, it } from "vitest";

import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  getSelectedPriceCents,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";

// cfw-cus evidence test: prove the cfw variant-selection read path returns
// distinct prices and distinct images across variants WHEN the upstream Wix
// product carries distinct per-variant priceData and per-choice media. The
// Kingston fixture (src/lib/fixtures/products.ts) is shaped the way a
// correctly-configured Wix Stores product would be: 6 variants spanning
// Frame Color × Size, with priceData.price = $619/$719/$819 per Size and
// productOptions[*].choices[*].media per Color.
//
// This test exists to settle a triage question on cfw-cus: Stilgar reports
// "size click doesn't change price, color click doesn't change image" on
// the live site. Live Wix data inspection (Kingston PDP HTML) shows
// Wix returning flat `price: 619` across all 4 sizes and zero color options
// across the entire catalog. The evidence below shows the cfw code WILL swap
// price + image once the catalog is populated correctly. The remaining
// follow-up is a Wix Stores dashboard task for Brenda/Stilgar.

const KINGSTON = FIXTURE_PRODUCTS.find(
  (p) => p.slug === "kingston-futon-frame",
);

describe("cfw-cus — variant binding read-path evidence (Kingston fixture)", () => {
  it("Kingston fixture exists and matches the shape Wix Stores returns", () => {
    expect(KINGSTON).toBeDefined();
    expect(KINGSTON?.productOptions?.length).toBe(2); // Frame Color, Size
    expect(KINGSTON?.variants?.length).toBe(6); // 2 colors × 3 sizes
  });

  describe("size click → distinct price (variants[*].variant.priceData.price)", () => {
    it.each([
      ["Full", 619],
      ["Queen", 719],
      ["King", 819],
    ])(
      "selecting Size: %s returns the variant-specific price ($%i)",
      (size, expectedDollars) => {
        const selection = { "Frame Color": "Natural", Size: size };
        const variants = KINGSTON!.variants as ReadonlyArray<VariantInput>;

        // findMatchingVariant resolves the variant for this exact selection.
        const variant = findMatchingVariant(variants, selection);
        expect(variant).not.toBeNull();
        expect(variant?._id).toBe(
          { Full: "fixture-var-k1", Queen: "fixture-var-k2", King: "fixture-var-k3" }[size],
        );

        // getSelectedPrice formats from variant.variant.priceData.price.
        // Format is locale-driven; assert the dollar amount appears and the
        // result is NOT the fallback string.
        const fallback = "from $619";
        const price = getSelectedPrice(variants, selection, fallback);
        expect(price).not.toBe(fallback);
        expect(price).toContain(String(expectedDollars));

        // Cents version drives the cart line.
        expect(getSelectedPriceCents(variants, selection, 0)).toBe(
          expectedDollars * 100,
        );
      },
    );

    it("each Size returns a DISTINCT price (across all 3)", () => {
      const variants = KINGSTON!.variants as ReadonlyArray<VariantInput>;
      const cents = ["Full", "Queen", "King"].map((size) =>
        getSelectedPriceCents(
          variants,
          { "Frame Color": "Natural", Size: size },
          0,
        ),
      );
      expect(new Set(cents).size).toBe(3);
      expect(cents).toEqual([61_900, 71_900, 81_900]);
    });
  });

  describe("color click → distinct image (productOptions[*].choices[*].media.mainMedia.image.url)", () => {
    it.each([
      ["Natural", "1505693416388"], // matches KINGSTON_NATURAL_IMG fragment
      ["Espresso", "1493663284031"], // matches KINGSTON_ESPRESSO_IMG fragment
    ])(
      "selecting Frame Color: %s returns the choice-specific image",
      (color, urlFragment) => {
        const selection = { "Frame Color": color, Size: "Full" };
        const productOptions =
          KINGSTON!.productOptions as ReadonlyArray<ProductOptionInput>;
        const variants = KINGSTON!.variants as ReadonlyArray<VariantInput>;

        const url = getSelectedImageUrl(
          variants,
          selection,
          "https://fallback.example/main.jpg",
          productOptions,
          [],
        );
        expect(url).toBeTruthy();
        expect(url).toContain(urlFragment);
        expect(url).not.toContain("fallback.example");
      },
    );

    it("the two Frame Color choices return DISTINCT image URLs", () => {
      const productOptions =
        KINGSTON!.productOptions as ReadonlyArray<ProductOptionInput>;
      const variants = KINGSTON!.variants as ReadonlyArray<VariantInput>;
      const fallback = "https://fallback.example/main.jpg";
      const naturalUrl = getSelectedImageUrl(
        variants,
        { "Frame Color": "Natural", Size: "Full" },
        fallback,
        productOptions,
        [],
      );
      const espressoUrl = getSelectedImageUrl(
        variants,
        { "Frame Color": "Espresso", Size: "Full" },
        fallback,
        productOptions,
        [],
      );
      expect(naturalUrl).not.toBe(espressoUrl);
      expect(naturalUrl).not.toBe(fallback);
      expect(espressoUrl).not.toBe(fallback);
    });
  });

  describe("data-state proof — what flat Wix data looks like", () => {
    it("when Wix returns flat priceData (every variant === product fallback), all sizes return the same price", () => {
      // Synthesize the live-Kingston state: every variant.priceData.price = 619
      // (the symptom Stilgar is reporting on the live site).
      const variants: VariantInput[] = (
        KINGSTON!.variants as VariantInput[]
      ).map((v) => ({
        ...v,
        variant: { priceData: { price: 619 } },
      }));
      const fallback = "$619.00";
      const cents = ["Full", "Queen", "King"].map((size) =>
        getSelectedPriceCents(
          variants,
          { "Frame Color": "Natural", Size: size },
          61_900,
        ),
      );
      // All three are the same — exactly the live-site symptom. Proves the
      // cfw code is forwarding what Wix gives it; the visible flat-pricing
      // is a Wix Stores catalog-config gap, not a cfw regression.
      expect(new Set(cents).size).toBe(1);
      expect(cents).toEqual([61_900, 61_900, 61_900]);
      expect(getSelectedPrice(variants, { Size: "Queen" }, fallback)).toContain(
        "619",
      );
    });

    it("when Wix returns no per-choice media, getSelectedImageUrl falls back to the gallery", () => {
      // Synthesize the live-catalog state: zero products have Color choices
      // configured. With productOptions empty (no Color), there's nothing
      // for getSelectedImageUrl to swap to — it returns the fallback.
      const variants = KINGSTON!.variants as ReadonlyArray<VariantInput>;
      const fallback = "https://fallback.example/main.jpg";
      const url = getSelectedImageUrl(variants, { Size: "Full" }, fallback, [], []);
      expect(url).toBe(fallback);
    });
  });
});

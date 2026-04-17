import { describe, expect, it } from "vitest";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  initialSelection,
  isChoiceAvailable,
  isSelectionComplete,
  isVariantInStock,
  type ProductOptionInput,
  type VariantInput,
} from "@/lib/product/variant-selection";

const options: ProductOptionInput[] = [
  {
    name: "Size",
    choices: [
      { value: "Full", description: "Full" },
      { value: "Queen", description: "Queen" },
    ],
  },
  {
    name: "Fabric",
    choices: [
      { value: "Linen", description: "Linen" },
      { value: "Velvet", description: "Velvet" },
    ],
  },
];

const variants: VariantInput[] = [
  {
    _id: "v-full-linen",
    choices: { Size: "Full", Fabric: "Linen" },
    variant: { priceData: { formatted: { price: "$799" } } },
    stock: { inStock: true, trackQuantity: false },
    media: { mainMedia: { image: { url: "https://img/full-linen.jpg" } } },
  },
  {
    _id: "v-full-velvet",
    choices: { Size: "Full", Fabric: "Velvet" },
    variant: { priceData: { formatted: { price: "$899" } } },
    stock: { inStock: false, trackQuantity: false },
    media: { mainMedia: { image: { url: "https://img/full-velvet.jpg" } } },
  },
  {
    _id: "v-queen-linen",
    choices: { Size: "Queen", Fabric: "Linen" },
    variant: { priceData: { formatted: { price: "$999" } } },
    stock: { inStock: true, trackQuantity: true, quantity: 3 },
  },
  {
    _id: "v-queen-velvet",
    choices: { Size: "Queen", Fabric: "Velvet" },
    variant: { priceData: { formatted: { price: "$1,099" } } },
    stock: { inStock: true, trackQuantity: true, quantity: 0 },
  },
];

describe("isVariantInStock", () => {
  it("returns true for a variant without a stock object", () => {
    expect(isVariantInStock({ _id: "v", choices: {} })).toBe(true);
  });

  it("respects trackQuantity when quantity is set", () => {
    expect(isVariantInStock(variants[2])).toBe(true);
    expect(isVariantInStock(variants[3])).toBe(false);
  });

  it("falls back to inStock flag when quantity is not tracked", () => {
    expect(isVariantInStock(variants[0])).toBe(true);
    expect(isVariantInStock(variants[1])).toBe(false);
  });

  it("returns false for null/undefined input", () => {
    expect(isVariantInStock(null)).toBe(false);
    expect(isVariantInStock(undefined)).toBe(false);
  });
});

describe("findMatchingVariant", () => {
  it("returns the variant whose choices match the selection", () => {
    expect(
      findMatchingVariant(variants, { Size: "Queen", Fabric: "Linen" })?._id,
    ).toBe("v-queen-linen");
  });

  it("returns null for a selection with no matching variant", () => {
    expect(
      findMatchingVariant(variants, { Size: "King", Fabric: "Linen" }),
    ).toBeNull();
  });

  it("returns null for an empty selection", () => {
    expect(findMatchingVariant(variants, {})).toBeNull();
  });

  it("returns null for an empty variants array", () => {
    expect(findMatchingVariant([], { Size: "Full" })).toBeNull();
  });
});

describe("isSelectionComplete", () => {
  it("is true only when every named option has a selected value", () => {
    expect(isSelectionComplete(options, { Size: "Full", Fabric: "Linen" })).toBe(true);
    expect(isSelectionComplete(options, { Size: "Full" })).toBe(false);
    expect(isSelectionComplete(options, {})).toBe(false);
  });

  it("is false for a product with no options (no decisions to confirm)", () => {
    expect(isSelectionComplete([], {})).toBe(false);
  });
});

describe("isChoiceAvailable", () => {
  it("returns true for a choice whose resulting variant is in stock", () => {
    expect(isChoiceAvailable(variants, "Fabric", "Linen", { Size: "Full" })).toBe(true);
  });

  it("returns false for a choice whose resulting variant is out of stock", () => {
    expect(isChoiceAvailable(variants, "Fabric", "Velvet", { Size: "Full" })).toBe(false);
    expect(isChoiceAvailable(variants, "Fabric", "Velvet", { Size: "Queen" })).toBe(false);
  });

  it("returns true for a choice that narrows to any in-stock variant when other options are blank", () => {
    expect(isChoiceAvailable(variants, "Size", "Full", {})).toBe(true);
    expect(isChoiceAvailable(variants, "Size", "Queen", {})).toBe(true);
  });
});

describe("getSelectedPrice", () => {
  it("returns the matching variant's formatted price", () => {
    expect(getSelectedPrice(variants, { Size: "Full", Fabric: "Linen" }, "$0")).toBe("$799");
  });

  it("falls back when no variant matches", () => {
    expect(getSelectedPrice(variants, { Size: "King" }, "from $799")).toBe("from $799");
  });
});

describe("getSelectedImageUrl", () => {
  it("returns the matching variant's media when present", () => {
    expect(
      getSelectedImageUrl(variants, { Size: "Full", Fabric: "Linen" }, "https://fallback"),
    ).toBe("https://img/full-linen.jpg");
  });

  it("falls back to provided url when variant has no media", () => {
    expect(
      getSelectedImageUrl(variants, { Size: "Queen", Fabric: "Linen" }, "https://fallback"),
    ).toBe("https://fallback");
  });

  it("falls back when no variant matches", () => {
    expect(
      getSelectedImageUrl(variants, { Size: "King" }, "https://fallback"),
    ).toBe("https://fallback");
  });
});

describe("initialSelection", () => {
  it("seeds selection from the first in-stock variant", () => {
    expect(initialSelection(options, variants)).toEqual({
      Size: "Full",
      Fabric: "Linen",
    });
  });

  it("falls back to the first variant if none are in stock", () => {
    const oos: VariantInput[] = [
      { _id: "a", choices: { Size: "Full", Fabric: "Linen" }, stock: { inStock: false } },
      { _id: "b", choices: { Size: "Queen", Fabric: "Velvet" }, stock: { inStock: false } },
    ];
    expect(initialSelection(options, oos)).toEqual({
      Size: "Full",
      Fabric: "Linen",
    });
  });

  it("returns {} when the first variant has no recorded choices", () => {
    expect(initialSelection(options, [{ _id: "a" }])).toEqual({});
  });

  it("returns {} when variants is empty", () => {
    expect(initialSelection(options, [])).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import {
  findMatchingVariant,
  getSelectedImageUrl,
  getSelectedPrice,
  getSelectedPriceCents,
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

  // cfw-1nm Bug 2: Wix Stores often returns priceData.price (number) without
  // priceData.formatted on per-variant data — the picker must format it itself
  // rather than fall back to the product-level fallback.
  it("formats from raw priceData.price when formatted.price is absent", () => {
    const noFormatted: VariantInput[] = [
      {
        _id: "v",
        choices: { Size: "King" },
        variant: { priceData: { price: 899, currency: "USD" } },
        stock: { inStock: true },
      },
    ];
    expect(getSelectedPrice(noFormatted, { Size: "King" }, "$0")).toBe("$899");
  });
});

describe("getSelectedPriceCents", () => {
  it("returns the matching variant's price in cents", () => {
    const v: VariantInput[] = [
      {
        _id: "v",
        choices: { Size: "King" },
        variant: { priceData: { price: 1899, currency: "USD" } },
        stock: { inStock: true },
      },
    ];
    expect(getSelectedPriceCents(v, { Size: "King" }, 0)).toBe(189_900);
  });

  it("falls back when variant has no priceData.price", () => {
    expect(getSelectedPriceCents(variants, { Size: "King" }, 79_900)).toBe(79_900);
    expect(
      getSelectedPriceCents(
        [{ _id: "v", choices: { Size: "Full" } }],
        { Size: "Full" },
        50_000,
      ),
    ).toBe(50_000);
  });

  // Avoid floating-point drift: 12.99 * 100 === 1299.0000000000002 in JS.
  it("rounds to integer cents for fractional prices", () => {
    const v: VariantInput[] = [
      {
        _id: "v",
        choices: { Size: "Full" },
        variant: { priceData: { price: 12.99 } },
        stock: { inStock: true },
      },
    ];
    expect(getSelectedPriceCents(v, { Size: "Full" }, 0)).toBe(1299);
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

  // cfw-1nm Bug 1: Wix Stores v1 puts swatch images on
  // productOptions[*].choices[*].media — never on the Variant. The picker
  // must read choice media so color selection swaps the gallery.
  it("returns the selected choice's media when productOptions carry per-choice media", () => {
    const optionsWithMedia: ProductOptionInput[] = [
      {
        name: "Color",
        choices: [
          {
            value: "Cherry",
            description: "Cherry",
            media: { mainMedia: { image: { url: "https://img/cherry.jpg" } } },
          },
          {
            value: "Walnut",
            description: "Walnut",
            media: { mainMedia: { image: { url: "https://img/walnut.jpg" } } },
          },
        ],
      },
    ];
    const variantsNoMedia: VariantInput[] = [
      { _id: "v1", choices: { Color: "Cherry" }, stock: { inStock: true } },
      { _id: "v2", choices: { Color: "Walnut" }, stock: { inStock: true } },
    ];
    expect(
      getSelectedImageUrl(variantsNoMedia, { Color: "Cherry" }, "https://fallback", optionsWithMedia),
    ).toBe("https://img/cherry.jpg");
    expect(
      getSelectedImageUrl(variantsNoMedia, { Color: "Walnut" }, "https://fallback", optionsWithMedia),
    ).toBe("https://img/walnut.jpg");
  });

  it("uses choice media in preference to variant media when both are present", () => {
    const optionsWithMedia: ProductOptionInput[] = [
      {
        name: "Size",
        choices: [
          {
            value: "Full",
            description: "Full",
            media: { mainMedia: { image: { url: "https://img/choice-full.jpg" } } },
          },
        ],
      },
    ];
    expect(
      getSelectedImageUrl(
        variants,
        { Size: "Full", Fabric: "Linen" },
        "https://fallback",
        optionsWithMedia,
      ),
    ).toBe("https://img/choice-full.jpg");
  });

  it("falls through to variant media when the selected choice has none", () => {
    const optionsNoMedia: ProductOptionInput[] = [
      { name: "Size", choices: [{ value: "Full", description: "Full" }] },
    ];
    expect(
      getSelectedImageUrl(
        variants,
        { Size: "Full", Fabric: "Linen" },
        "https://fallback",
        optionsNoMedia,
      ),
    ).toBe("https://img/full-linen.jpg");
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

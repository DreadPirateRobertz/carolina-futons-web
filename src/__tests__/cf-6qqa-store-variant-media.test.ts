/**
 * cf-6qqa: mergeVariantMedia — StoreVariant media merge
 *
 * queryStoreVariants returns StoreVariant.media.image.url per variant.
 * mergeVariantMedia maps choices→URL into each product variant's
 * media.mainMedia.image.url so getSelectedImageUrl's back-compat path fires.
 */
import { describe, it, expect } from "vitest";
import { mergeVariantMedia } from "@/lib/wix/products";
import type { WixProduct } from "@/lib/wix/products";

// Wix Variant type has no `media` field — mergeVariantMedia attaches it at
// runtime. Cast result variants through this shape for assertion-only access.
type MergedVariant = {
  media?: {
    mainMedia?: { image?: { url?: string | null } | null } | null;
  } | null;
};

function variantAt(product: WixProduct, idx: number): MergedVariant {
  return product.variants?.[idx] as unknown as MergedVariant;
}

type RawVariant = NonNullable<WixProduct["variants"]>[number];

function makeProduct(variants: WixProduct["variants"]): WixProduct {
  return {
    _id: "prod-1",
    name: "Test Futon",
    variants,
  } as unknown as WixProduct;
}

const storeVariants = [
  {
    choices: { Color: "Cherry", Size: "Full" },
    media: { image: { url: "https://img.wix.com/cherry-full.jpg" } },
  },
  {
    choices: { Color: "Walnut", Size: "Full" },
    media: { image: { url: "https://img.wix.com/walnut-full.jpg" } },
  },
  {
    choices: { Color: "Cherry", Size: "Queen" },
    media: { image: { url: "https://img.wix.com/cherry-queen.jpg" } },
  },
];

describe("mergeVariantMedia", () => {
  it("merges matching StoreVariant media into variant.media.mainMedia.image.url", () => {
    const product = makeProduct([
      { choices: { Color: "Cherry", Size: "Full" } },
      { choices: { Color: "Walnut", Size: "Full" } },
    ]);
    const result = mergeVariantMedia(product, storeVariants);
    expect(variantAt(result, 0)?.media?.mainMedia?.image?.url).toBe(
      "https://img.wix.com/cherry-full.jpg",
    );
    expect(variantAt(result, 1)?.media?.mainMedia?.image?.url).toBe(
      "https://img.wix.com/walnut-full.jpg",
    );
  });

  it("choices key matching is order-independent", () => {
    // Store variant has Size first, product variant has Color first
    const product = makeProduct([
      { choices: { Color: "Cherry", Size: "Full" } },
    ]);
    const sv = [{ choices: { Size: "Full", Color: "Cherry" }, media: { image: { url: "https://img.wix.com/cherry-full.jpg" } } }];
    const result = mergeVariantMedia(product, sv);
    expect(variantAt(result, 0)?.media?.mainMedia?.image?.url).toBe(
      "https://img.wix.com/cherry-full.jpg",
    );
  });

  it("leaves variants without a matching StoreVariant unchanged", () => {
    const product = makeProduct([
      { choices: { Color: "Cherry", Size: "Full" } },
      { choices: { Color: "Black", Size: "Twin" } }, // no match
    ]);
    const result = mergeVariantMedia(product, storeVariants);
    expect(variantAt(result, 0)?.media?.mainMedia?.image?.url).toBe(
      "https://img.wix.com/cherry-full.jpg",
    );
    expect(variantAt(result, 1)?.media).toBeUndefined();
  });

  it("returns product unchanged when storeVariants is null", () => {
    const product = makeProduct([{ choices: { Color: "Cherry" } }]);
    expect(mergeVariantMedia(product, null)).toBe(product);
  });

  it("returns product unchanged when storeVariants is empty", () => {
    const product = makeProduct([{ choices: { Color: "Cherry" } }]);
    expect(mergeVariantMedia(product, [])).toBe(product);
  });

  it("returns product unchanged when product has no variants", () => {
    const product = makeProduct([]);
    expect(mergeVariantMedia(product, storeVariants)).toBe(product);
  });

  it("skips StoreVariants with no media URL", () => {
    const product = makeProduct([{ choices: { Color: "Cherry", Size: "Full" } }]);
    const sv = [
      { choices: { Color: "Cherry", Size: "Full" }, media: { image: { url: null } } },
    ];
    const result = mergeVariantMedia(product, sv);
    expect(variantAt(result, 0)?.media).toBeUndefined();
  });

  it("replaces existing variant media when StoreVariant has a URL", () => {
    const existingMedia = { mainMedia: { image: { url: "https://img.wix.com/existing.jpg" } } };
    const product = makeProduct([
      { choices: { Color: "Cherry", Size: "Full" } } as unknown as RawVariant,
    ]);
    // Attach existing media via cast since Wix Variant type omits the field
    (product.variants as unknown as MergedVariant[])[0] = {
      ...product.variants![0],
      media: existingMedia,
    } as unknown as MergedVariant;
    const sv = [{ choices: { Color: "Cherry", Size: "Full" }, media: { image: { url: "https://img.wix.com/new.jpg" } } }];
    const result = mergeVariantMedia(product, sv);
    expect(variantAt(result, 0)?.media?.mainMedia?.image?.url).toBe(
      "https://img.wix.com/new.jpg",
    );
  });
});

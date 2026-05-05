import { describe, expect, it } from "vitest";

import { mergeProductMedia } from "@/lib/wix/products";
import type { WixProduct } from "@/lib/wix/products";

// cfw-3l9: PDP gallery showed only the main image because Wix's two-step
// fetch (queryProducts → getProduct) returns different media shapes —
// queryProducts carries the full media.items[] while getProduct(_id)
// returns it empty for many products. mergeProductMedia picks the truer
// items[] so the PdpGallery thumbnail strip can render.

const mainA = { image: { url: "https://img/a.jpg" }, mediaType: "image" as const };
const mainB = { image: { url: "https://img/b.jpg" }, mediaType: "image" as const };
const itemB = { image: { url: "https://img/b.jpg" }, mediaType: "image" as const };
const itemC = { image: { url: "https://img/c.jpg" }, mediaType: "image" as const };
const itemD = { image: { url: "https://img/d.jpg" }, mediaType: "image" as const };

function product(media: WixProduct["media"]): WixProduct {
  return { _id: "p1", slug: "p1", media } as WixProduct;
}

describe("mergeProductMedia (cfw-3l9)", () => {
  it("uses the stub's items[] when getProduct returns an empty items[]", () => {
    const full = product({ mainMedia: mainA, items: [] });
    const stub = product({ mainMedia: mainA, items: [itemB, itemC, itemD] });
    const merged = mergeProductMedia(full, stub);
    expect(merged.media?.items?.map((i) => i.image?.url)).toEqual([
      "https://img/b.jpg",
      "https://img/c.jpg",
      "https://img/d.jpg",
    ]);
  });

  it("uses the stub's items[] when getProduct's media is undefined", () => {
    const full = product(undefined);
    const stub = product({ mainMedia: mainA, items: [itemB, itemC] });
    const merged = mergeProductMedia(full, stub);
    expect(merged.media?.items).toHaveLength(2);
    expect(merged.media?.mainMedia?.image?.url).toBe("https://img/a.jpg");
  });

  it("keeps the full product's items[] when it already has more entries", () => {
    const full = product({ mainMedia: mainA, items: [itemB, itemC, itemD] });
    const stub = product({ mainMedia: mainA, items: [itemB] });
    const merged = mergeProductMedia(full, stub);
    expect(merged.media?.items).toHaveLength(3);
  });

  it("returns the full product unchanged when nothing needs merging", () => {
    const full = product({ mainMedia: mainA, items: [itemB] });
    const stub = product({ mainMedia: mainA, items: [itemB] });
    const merged = mergeProductMedia(full, stub);
    expect(merged).toBe(full);
  });

  it("falls back to stub.mainMedia when getProduct is missing mainMedia", () => {
    const full = product({ items: [] });
    const stub = product({ mainMedia: mainB, items: [] });
    const merged = mergeProductMedia(full, stub);
    expect(merged.media?.mainMedia?.image?.url).toBe("https://img/b.jpg");
  });

  it("preserves the full product's mainMedia even when stub has its own", () => {
    const full = product({ mainMedia: mainA, items: [itemB, itemC] });
    const stub = product({ mainMedia: mainB, items: [itemB] });
    const merged = mergeProductMedia(full, stub);
    expect(merged.media?.mainMedia?.image?.url).toBe("https://img/a.jpg");
  });
});

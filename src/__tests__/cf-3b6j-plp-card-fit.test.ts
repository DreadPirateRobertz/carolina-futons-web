import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cf-3b6j: pin PLP grid card images to object-contain. Stilgar reported
// "PLP cards still slightly over-zoomed on all products" — primary +
// secondary images on ProductCard were object-cover combined with the
// hover scale-1.03, double-cropping non-square product photos. Contain
// (with the aspect-square wrapper's bg-zinc-100 letterbox) shows the
// whole product like the PDP fix in cfw-l0m.

const SRC = readFileSync(
  resolve(__dirname, "../components/product/ProductCard.tsx"),
  "utf8",
);

describe("ProductCard image fit (cf-3b6j)", () => {
  it("primary image data-slot exists in the source", () => {
    expect(SRC).toMatch(/data-slot="product-card-primary-image"/);
  });

  it("primary + secondary images both use object-contain (not object-cover)", () => {
    // No object-cover className remaining anywhere on the Image elements.
    // The block between the data-slot anchors and the closing /> bounds the
    // surface — keeps test from failing if a future unrelated comment uses
    // the literal word "object-cover" in source prose.
    const primaryBlock =
      SRC.split('data-slot="product-card-primary-image"')[1]?.split("/>")[0] ?? "";
    expect(primaryBlock).toMatch(/object-contain/);
    expect(primaryBlock).not.toMatch(/object-cover/);

    const secondaryBlock =
      SRC.split('data-slot="product-card-secondary-image"')[1]?.split("/>")[0] ?? "";
    expect(secondaryBlock).toMatch(/object-contain/);
    expect(secondaryBlock).not.toMatch(/object-cover/);
  });

  it("hover scale-1.03 micro-interaction is preserved (no UX regression)", () => {
    expect(SRC).toMatch(/group-hover:scale-\[1\.03\]/);
  });
});

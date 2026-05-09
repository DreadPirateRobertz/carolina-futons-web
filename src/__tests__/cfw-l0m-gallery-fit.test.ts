import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// cfw-l0m: pin the main PDP gallery image to object-contain so a future
// edit doesn't accidentally swap back to object-cover and re-introduce
// Stilgar's "too zoomed in" symptom. Contain shows the whole product
// (with letterbox bars when the photo isn't square) to match the
// fullscreen lightbox view's contain behavior. Thumbnails stay
// object-cover — they're 64x64 tiles where cover-fill is fine.

const FILES = {
  pdpGallery: "../components/product/PdpGallery.tsx",
  pdpInteractive: "../components/product/PdpInteractive.tsx",
  lightbox: "../components/product/GalleryZoomLightbox.tsx",
} as const;

function read(rel: string): string {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("PDP gallery main image — object-contain (cfw-l0m)", () => {
  it("PdpGallery main <m.img> uses object-contain (not object-cover)", () => {
    const src = read(FILES.pdpGallery);
    // The main image is the <m.img> with data-testid="pdp-main-image".
    // Find the className surrounding it.
    const block = src.split('data-testid="pdp-main-image"')[1] ?? "";
    expect(block.split("/>")[0]).toMatch(/object-contain/);
    expect(block.split("/>")[0]).not.toMatch(/object-cover/);
  });

  it("PdpInteractive no-gallery fallback <img> uses object-contain", () => {
    const src = read(FILES.pdpInteractive);
    const block = src.split('data-testid="pdp-main-image"')[1] ?? "";
    expect(block.split("/>")[0]).toMatch(/object-contain/);
    expect(block.split("/>")[0]).not.toMatch(/object-cover/);
  });

  it("GalleryZoomLightbox stays object-contain (no regression on fullscreen view)", () => {
    expect(read(FILES.lightbox)).toMatch(/object-contain/);
  });

  it("PdpGallery thumbnail strip stays object-cover (64x64 tiles want cover-fill)", () => {
    const src = read(FILES.pdpGallery);
    // The thumbnail <img> sits inside the role="tablist" block.
    expect(src).toMatch(/h-full w-full object-cover/);
  });
});

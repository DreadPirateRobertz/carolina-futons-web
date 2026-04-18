import { describe, it, expect } from "vitest";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";
import { HERO_SLIDES } from "@/app/page";

describe("SHOP_CATEGORIES data integrity", () => {
  it("every category has a non-empty image URL", () => {
    for (const cat of SHOP_CATEGORIES) {
      expect(cat.image, `${cat.slug} missing image`).toBeTruthy();
      expect(typeof cat.image).toBe("string");
    }
  });

  it("all image URLs point to the Wix CDN", () => {
    for (const cat of SHOP_CATEGORIES) {
      expect(
        cat.image,
        `${cat.slug} image should be a Wix CDN URL`,
      ).toMatch(/static\.wixstatic\.com/);
    }
  });
});

describe("HERO_SLIDES data integrity", () => {
  it("has exactly 3 slides", () => {
    expect(HERO_SLIDES).toHaveLength(3);
  });

  it("all 3 slide src URLs are distinct (no duplicates)", () => {
    const srcs = HERO_SLIDES.map((s) => s.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("every slide has a non-empty alt text", () => {
    for (const slide of HERO_SLIDES) {
      expect(slide.alt.trim().length).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect } from "vitest";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

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

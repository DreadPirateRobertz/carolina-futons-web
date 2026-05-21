// cfw-dv5: sub-category pills — SHOP_CATEGORIES manifest tests.
// No mocks: exercises the real categories.ts so any edit to that file
// is immediately reflected here.

import { describe, it, expect } from "vitest";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

describe("SHOP_CATEGORIES futon-frames subcategories (cfw-dv5)", () => {
  const ff = SHOP_CATEGORIES.find((c) => c.slug === "futon-frames");

  it("futon-frames entry exists", () => {
    expect(ff).toBeDefined();
  });

  it("futon-frames has a subcategories array", () => {
    expect(Array.isArray((ff as any)?.subcategories)).toBe(true);
  });

  it("futon-frames has exactly 4 subcategories", () => {
    expect((ff as any)?.subcategories).toHaveLength(4);
  });

  it("each subcategory has slug, name, nameContains string fields", () => {
    for (const sub of (ff as any)?.subcategories ?? []) {
      expect(typeof sub.slug).toBe("string");
      expect(typeof sub.name).toBe("string");
      expect(typeof sub.nameContains).toBe("string");
      expect(sub.slug.length).toBeGreaterThan(0);
      expect(sub.name.length).toBeGreaterThan(0);
      expect(sub.nameContains.length).toBeGreaterThan(0);
    }
  });

  it("subcategory slugs are kebab-case (lowercase + hyphens only)", () => {
    for (const sub of (ff as any)?.subcategories ?? []) {
      expect(sub.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("subcategory slugs are unique within futon-frames", () => {
    const slugs = ((ff as any)?.subcategories ?? []).map((s: any) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes the wall-huggers subcategory", () => {
    const slugs = ((ff as any)?.subcategories ?? []).map((s: any) => s.slug);
    expect(slugs).toContain("wall-huggers");
  });

  it("includes the rustic-log subcategory", () => {
    const slugs = ((ff as any)?.subcategories ?? []).map((s: any) => s.slug);
    expect(slugs).toContain("rustic-log");
  });

  it("other SHOP_CATEGORIES entries do not have subcategories", () => {
    const others = SHOP_CATEGORIES.filter((c) => c.slug !== "futon-frames");
    for (const cat of others) {
      const subs = (cat as any).subcategories;
      expect(subs == null || (Array.isArray(subs) && subs.length === 0)).toBe(true);
    }
  });
});

// cfw-rbx: structural coverage for src/lib/shop/categories.ts. The risks
// here aren't logic bugs (the file is mostly static data + a one-line
// findCategory) — they're shape/uniqueness drift that ships PLP cards
// silently broken:
//
//   - A duplicated slug would silently make findCategory return the
//     first match; the second category becomes unreachable.
//   - A derived category (filter set) without sourceSlug or
//     emptyStateCopy slips past TS (both are optional) and rots in
//     production.
//   - Empty/whitespace name or description silently ships an unreadable
//     PLP card.

import { describe, it, expect } from "vitest";

import {
  SHOP_CATEGORIES,
  findCategory,
} from "@/lib/shop/categories";

describe("SHOP_CATEGORIES manifest", () => {
  it("is non-empty", () => {
    expect(SHOP_CATEGORIES.length).toBeGreaterThan(0);
  });

  it.each(SHOP_CATEGORIES)(
    "every category has non-empty slug, name, description, collectionSlug — $slug",
    (cat) => {
      expect(cat.slug.length).toBeGreaterThan(0);
      expect(cat.name.trim().length).toBeGreaterThan(0);
      expect(cat.description.trim().length).toBeGreaterThan(0);
      expect(cat.collectionSlug.length).toBeGreaterThan(0);
    },
  );

  it("slugs use kebab-case (lowercase letters, numbers, hyphens only)", () => {
    for (const cat of SHOP_CATEGORIES) {
      expect(cat.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("all slugs are unique (collisions silently break findCategory)", () => {
    const slugs = SHOP_CATEGORIES.map((c) => c.slug);
    const set = new Set(slugs);
    expect(set.size).toBe(slugs.length);
  });

  it("all collectionSlugs are non-empty (PLP can't resolve to a Wix collection without one)", () => {
    for (const cat of SHOP_CATEGORIES) {
      expect(cat.collectionSlug.length).toBeGreaterThan(0);
    }
  });

  it("derived categories (filter set) ALSO have sourceSlug AND emptyStateCopy", () => {
    // A derived category without sourceSlug falls back to collectionSlug —
    // which doesn't exist in Wix for derived categories, so the PLP would
    // 0-product. emptyStateCopy is required because the default copy
    // ("No products found in this collection yet.") is misleading for
    // sale-style categories where empty IS a valid state.
    const derived = SHOP_CATEGORIES.filter((c) => c.filter !== undefined);
    expect(derived.length).toBeGreaterThan(0); // sanity — sale + mattresses-sale exist today
    for (const cat of derived) {
      expect(
        cat.sourceSlug,
        `derived category ${cat.slug} missing sourceSlug`,
      ).toBeTruthy();
      expect(
        cat.emptyStateCopy,
        `derived category ${cat.slug} missing emptyStateCopy`,
      ).toBeTruthy();
    }
  });

  it("non-derived categories DO NOT set sourceSlug (would cause silent re-routing)", () => {
    const regular = SHOP_CATEGORIES.filter((c) => c.filter === undefined);
    for (const cat of regular) {
      expect(
        cat.sourceSlug,
        `regular category ${cat.slug} unexpectedly has sourceSlug`,
      ).toBeUndefined();
    }
  });

  it("filter values are limited to the documented CategoryFilter union ('on-sale')", () => {
    // CategoryFilter is a string-literal union — TS catches widening at
    // compile time, but a hand-edited "filter": "ON-SALE" (uppercase) or
    // typo "filter": "on-sail" would still compile if cast. Pin the
    // runtime values so a casing/typo regression fails CI.
    const ALLOWED: ReadonlyArray<string> = ["on-sale"];
    for (const cat of SHOP_CATEGORIES) {
      if (cat.filter !== undefined) {
        expect(ALLOWED).toContain(cat.filter);
      }
    }
  });

  it("includes the four core PLP slugs (cf-3qt.2 baseline regression guard)", () => {
    const slugs = new Set(SHOP_CATEGORIES.map((c) => c.slug));
    for (const required of [
      "futon-frames",
      "murphy-cabinet-beds",
      "platform-beds",
      "mattresses",
    ]) {
      expect(slugs, `core slug ${required} missing`).toContain(required);
    }
  });
});

describe("findCategory", () => {
  it("returns the matching category for a known slug", () => {
    const cat = findCategory("futon-frames");
    expect(cat).toBeDefined();
    expect(cat?.slug).toBe("futon-frames");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findCategory("not-a-real-slug")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(findCategory("")).toBeUndefined();
  });

  it("is case-sensitive — uppercase doesn't match", () => {
    // PLP routes are lowercase; case-insensitive matching would invite
    // SEO-poisoning duplicates. Pin the strict-equality behaviour.
    expect(findCategory("FUTON-FRAMES")).toBeUndefined();
    expect(findCategory("Futon-Frames")).toBeUndefined();
  });

  it("does not match by partial substring", () => {
    expect(findCategory("futon")).toBeUndefined();
    expect(findCategory("futon-")).toBeUndefined();
  });

  it("returns the same reference on repeated calls (no defensive copy)", () => {
    // findCategory is a hot path in the PLP route; pin the cheap shape so
    // a future "defensive clone" refactor surfaces here first.
    const a = findCategory("mattresses");
    const b = findCategory("mattresses");
    expect(a).toBe(b);
  });
});

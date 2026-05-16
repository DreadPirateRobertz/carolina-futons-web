/**
 * cf-12u4 — TDD tests for the GA4 item_category resolver.
 *
 * Background: the PDP page previously sent `product.collectionIds?.[0]`
 * to GA4 as item_category. The Wix collectionIds array is sorted
 * unpredictably, so a mattress that's ALSO in the `sale` collection
 * could report item_category='sale' depending on order — diverging
 * from the warranty gate (which uses set-membership) and under-
 * reporting mattress sales in GA4 dashboards.
 *
 * The resolver here uses the same set-membership semantic as
 * `warranty-gate.ts` but with a priority order so a multi-collection
 * product resolves to its primary category (mattresses > futon-frames
 * > murphy > platform > sofa > sale > uncategorized).
 *
 * Fail semantic: analytics fails SOFT (unknown → "uncategorized") in
 * contrast to the warranty gate which fails CLOSED. Different economics:
 * a misclassified GA4 event is a dashboard quirk; a misrendered
 * warranty section is an express-warranty misrepresentation under
 * NC GS 25-2-313.
 */
import { describe, it, expect } from "vitest";
import { resolveItemCategory, type CategoryCollectionMap } from "../item-category";

// Stable IDs so tests read predictably. The real Wix IDs are opaque
// GUIDs; the resolver doesn't care about the format, only equality.
const ID_MATTRESSES = "id-mattresses";
const ID_FRAMES = "id-futon-frames";
const ID_MURPHY = "id-murphy-cabinet-beds";
const ID_PLATFORM = "id-platform-beds";
const ID_SOFA = "id-sofa-beds";
const ID_SALE = "id-sale";

function makeMap(overrides: Partial<CategoryCollectionMap> = {}): CategoryCollectionMap {
  return {
    mattresses: { _id: ID_MATTRESSES },
    "futon-frames": { _id: ID_FRAMES },
    "murphy-cabinet-beds": { _id: ID_MURPHY },
    "platform-beds": { _id: ID_PLATFORM },
    "sofa-beds": { _id: ID_SOFA },
    sale: { _id: ID_SALE },
    ...overrides,
  };
}

// ── Single-category resolution ──────────────────────────────────────

describe("resolveItemCategory — single-category products", () => {
  it("returns 'mattresses' for a mattress-only product", () => {
    const result = resolveItemCategory(
      { collectionIds: [ID_MATTRESSES] },
      makeMap(),
    );
    expect(result).toBe("mattresses");
  });

  it("returns 'futon-frames' for a frame-only product", () => {
    expect(
      resolveItemCategory({ collectionIds: [ID_FRAMES] }, makeMap()),
    ).toBe("futon-frames");
  });

  it("returns 'murphy-cabinet-beds' for a murphy-only product", () => {
    expect(
      resolveItemCategory({ collectionIds: [ID_MURPHY] }, makeMap()),
    ).toBe("murphy-cabinet-beds");
  });

  it("returns 'platform-beds' for a platform-only product", () => {
    expect(
      resolveItemCategory({ collectionIds: [ID_PLATFORM] }, makeMap()),
    ).toBe("platform-beds");
  });

  it("returns 'sofa-beds' for a sofa-bed-only product", () => {
    expect(
      resolveItemCategory({ collectionIds: [ID_SOFA] }, makeMap()),
    ).toBe("sofa-beds");
  });
});

// ── Priority-aware multi-category resolution (the bug this fixes) ──

describe("resolveItemCategory — priority over sale collection (cf-12u4 fix)", () => {
  it("returns 'mattresses' for a sale-eligible mattress (not 'sale')", () => {
    // The exact bug from the bead: mattress in both 'mattresses' and 'sale'.
    // Order in collectionIds is whatever Wix returns; resolver must NOT
    // pick whichever sorts first.
    const result = resolveItemCategory(
      { collectionIds: [ID_SALE, ID_MATTRESSES] },
      makeMap(),
    );
    expect(result).toBe("mattresses");
  });

  it("returns 'mattresses' regardless of array order (membership not index)", () => {
    const result = resolveItemCategory(
      { collectionIds: [ID_MATTRESSES, ID_SALE] },
      makeMap(),
    );
    expect(result).toBe("mattresses");
  });

  it("returns 'futon-frames' for a sale-eligible frame", () => {
    expect(
      resolveItemCategory(
        { collectionIds: [ID_SALE, ID_FRAMES] },
        makeMap(),
      ),
    ).toBe("futon-frames");
  });

  it("returns 'murphy-cabinet-beds' for a sale-eligible murphy bed", () => {
    expect(
      resolveItemCategory(
        { collectionIds: [ID_SALE, ID_MURPHY] },
        makeMap(),
      ),
    ).toBe("murphy-cabinet-beds");
  });

  it("returns 'sale' ONLY when no primary category matches", () => {
    // Product only in 'sale' (e.g. clearance items not in any other
    // category) should still be reportable as 'sale' — that's a
    // legitimate category, just lowest priority.
    expect(
      resolveItemCategory({ collectionIds: [ID_SALE] }, makeMap()),
    ).toBe("sale");
  });
});

// ── Priority order between primary categories ───────────────────────

describe("resolveItemCategory — priority between primary categories", () => {
  it("prefers 'mattresses' over 'futon-frames' (mesa-bundle products live in frames but ARE mattresses)", () => {
    // Edge case: per warranty-gate.ts module docstring, a futon-with-
    // mattress bundle SKU lives in 'futon-frames' NOT 'mattresses'. So
    // this case (in BOTH collections) shouldn't occur in production.
    // But IF it did, the warranty gate would treat as mattress
    // (suppress frame warranty). For analytics alignment, we mirror
    // that judgment: mattresses wins.
    expect(
      resolveItemCategory(
        { collectionIds: [ID_FRAMES, ID_MATTRESSES] },
        makeMap(),
      ),
    ).toBe("mattresses");
  });

  it("prefers 'futon-frames' over 'platform-beds' (frame-family takes precedence)", () => {
    expect(
      resolveItemCategory(
        { collectionIds: [ID_PLATFORM, ID_FRAMES] },
        makeMap(),
      ),
    ).toBe("futon-frames");
  });
});

// ── Fail-soft semantic ──────────────────────────────────────────────

describe("resolveItemCategory — fail-soft on indeterminate input", () => {
  it("returns 'uncategorized' when collectionIds is undefined", () => {
    expect(resolveItemCategory({}, makeMap())).toBe("uncategorized");
  });

  it("returns 'uncategorized' when collectionIds is empty array", () => {
    expect(
      resolveItemCategory({ collectionIds: [] }, makeMap()),
    ).toBe("uncategorized");
  });

  it("returns 'uncategorized' when no collectionId matches any known category", () => {
    expect(
      resolveItemCategory(
        { collectionIds: ["unknown-collection-id-12345"] },
        makeMap(),
      ),
    ).toBe("uncategorized");
  });

  it("returns 'uncategorized' when categoryMap is empty (all lookups failed)", () => {
    expect(
      resolveItemCategory({ collectionIds: [ID_MATTRESSES] }, {}),
    ).toBe("uncategorized");
  });

  it("returns 'uncategorized' when a specific category collection failed to resolve (null _id)", () => {
    // Mirrors warranty-gate.ts: a category whose collection lookup
    // returned null (Wix outage, slug rename) is treated as if it
    // doesn't exist — set-membership against null can't match.
    const map = makeMap({ mattresses: null });
    expect(
      resolveItemCategory({ collectionIds: [ID_MATTRESSES] }, map),
    ).toBe("uncategorized");
  });
});

// ── Robustness to bad input ─────────────────────────────────────────

describe("resolveItemCategory — robustness", () => {
  it("ignores nullish entries in collectionIds", () => {
    // Defensive: Wix SDK occasionally yields sparse arrays in
    // degraded modes. Resolver must not crash.
    expect(
      resolveItemCategory(
        { collectionIds: [null as unknown as string, undefined as unknown as string, ID_MATTRESSES] },
        makeMap(),
      ),
    ).toBe("mattresses");
  });

  it("is referentially pure — same input yields same output", () => {
    const input = { collectionIds: [ID_SALE, ID_FRAMES] };
    const map = makeMap();
    const a = resolveItemCategory(input, map);
    const b = resolveItemCategory(input, map);
    expect(a).toBe(b);
  });
});

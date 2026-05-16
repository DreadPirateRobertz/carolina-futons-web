/**
 * cf-tmdb (cf-g640.fu4): catalog-shape invariant tests.
 *
 * cf-g640 (PR #664) gated PdpWarrantyInfo on `qualifiesForFrameWarranty(slug)`
 * — a slug-shape allowlist that rejects mattress/cover tokens. Pin two
 * invariants the slug-gate depends on, so a future catalog-shape drift
 * can't silently defeat the warranty section's protection:
 *
 *   1. Every category in SHOP_CATEGORIES that semantically denotes a
 *      frame-class collection produces a `true` slug-gate verdict.
 *      Every mattress/sale-mattress category produces `false`. Catches
 *      the case where SHOP_CATEGORIES grows a new frame-class slug
 *      shape (e.g. "loft-beds") without a matching pattern in
 *      FRAME_SLUG_SHAPES.
 *
 *   2. Hostile-shape SKU slugs (mixed-token slugs that look like frames
 *      but carry mattress/cover semantics) return `false` — the case
 *      pr-test-analyzer F3 raised about a merchandiser adding "Cody —
 *      Loveseat & Mattress" to the mattresses collection.
 *
 * Pure-function tests; no Wix Stores network. The expectation is that
 * a future cf-g640.fu5 adds a runtime conflict-detection helper that
 * cross-references product.collectionIds against the warranty gate.
 */
import { describe, expect, it } from "vitest";

import { qualifiesForFrameWarranty } from "@/lib/product/warranty-eligibility";
import { SHOP_CATEGORIES } from "@/lib/shop/categories";

// Manually-curated mapping of SHOP_CATEGORIES slugs → expected warranty
// verdict. Each entry encodes WHY the verdict is what it is so a future
// reader knows whether to add a new pattern (frame-class drift) or
// preserve the reject (mattress-class semantics).
//
// Drift-detection: if a new slug is added to SHOP_CATEGORIES, the table
// MUST be extended; the catch-all `it("every SHOP_CATEGORIES slug has
// an explicit table row")` test below fails otherwise.
const CATEGORY_VERDICT_TABLE: ReadonlyArray<{
  slug: string;
  qualifies: boolean;
  rationale: string;
}> = [
  {
    slug: "futon-frames",
    qualifies: true,
    rationale: "Core frame collection.",
  },
  {
    slug: "murphy-cabinet-beds",
    qualifies: true,
    rationale: "Murphy beds carry the same 15-year frame warranty.",
  },
  {
    slug: "platform-beds",
    qualifies: true,
    rationale: "Platform beds carry the same 15-year frame warranty.",
  },
  {
    slug: "mattresses",
    qualifies: false,
    rationale: "Mattresses carry separate manufacturer terms.",
  },
  {
    slug: "sofa-beds",
    qualifies: true,
    rationale: "Sofa beds carry the same 15-year frame warranty.",
  },
  {
    slug: "sale",
    qualifies: false,
    rationale:
      "Sale is a mixed collection (frames + mattresses). Conservative FALSE: the warranty section's copy is class-specific and can't be safely rendered on a mixed-class category page.",
  },
  {
    slug: "mattresses-sale",
    qualifies: false,
    rationale: "Mattress-only sale — same reject as mattresses.",
  },
];

describe("warranty-eligibility catalog-shape invariants (cf-tmdb)", () => {
  describe("SHOP_CATEGORIES coverage", () => {
    it("every SHOP_CATEGORIES slug has an explicit table row", () => {
      // Drift detection: if a new category is added to SHOP_CATEGORIES,
      // a contributor must consciously decide whether it qualifies for
      // the frame warranty by adding a table row above. Failing to do
      // so trips this test. The rationale string forces the decision
      // to be documented inline rather than implicit.
      const manifestSlugs = SHOP_CATEGORIES.map((c) => c.slug);
      const tableSlugs = CATEGORY_VERDICT_TABLE.map((r) => r.slug);
      for (const slug of manifestSlugs) {
        expect(tableSlugs).toContain(slug);
      }
    });

    it("every table row corresponds to a real SHOP_CATEGORIES slug", () => {
      // Inverse-drift detection: a stale table row (slug removed from
      // SHOP_CATEGORIES but left in the table) gives false confidence.
      const manifestSlugs = SHOP_CATEGORIES.map((c) => c.slug);
      for (const { slug } of CATEGORY_VERDICT_TABLE) {
        expect(manifestSlugs).toContain(slug);
      }
    });

    it.each(CATEGORY_VERDICT_TABLE)(
      "$slug → qualifiesForFrameWarranty === $qualifies ($rationale)",
      ({ slug, qualifies }) => {
        expect(qualifiesForFrameWarranty(slug)).toBe(qualifies);
      },
    );
  });

  describe("hostile SKU slugs (cf-tmdb pr-test-analyzer F3)", () => {
    // The threat model: a merchandiser names a product with frame-shape
    // tokens (cody, loveseat, sofa) AND a mattress-class token. The
    // PDP's slug-gate must reject the conflict-bearing slug rather than
    // promote it to the frame warranty surface.
    const HOSTILE_REJECTS: ReadonlyArray<{ slug: string; reason: string }> = [
      {
        slug: "cody-loveseat-mattress",
        reason: "frame-shape (cody-loveseat) + mattress token: mattress wins",
      },
      {
        slug: "platform-bed-mattress",
        reason: "platform-bed (frame) + mattress token: reject",
      },
      {
        slug: "murphy-mattress-replacement",
        reason: "murphy (frame token) + mattress token: reject",
      },
      {
        slug: "sofa-bed-cover",
        reason: "sofa-bed (frame token) + cover token: reject",
      },
      {
        slug: "futon-frame-slipcover",
        reason: "futon-frame + slipcover token: reject",
      },
      {
        slug: "twin-mattress-cover",
        reason: "both rejection tokens: reject (pre-cf-g640 baseline)",
      },
    ];

    it.each(HOSTILE_REJECTS)(
      "rejects $slug ($reason)",
      ({ slug }) => {
        expect(qualifiesForFrameWarranty(slug)).toBe(false);
      },
    );

    // Positive control: confirm the rejection isn't over-broad — slugs
    // that LOOK adjacent but are legitimately frame-only still pass.
    const FRAME_SLUGS: ReadonlyArray<string> = [
      "kingston-futon-frame",
      "cambridge-futon",
      "aspen-murphy-bed",
      "lowline-platform-bed-queen",
      "cody-sofa-bed",
    ];

    it.each(FRAME_SLUGS)(
      "accepts %s (no conflict tokens, valid frame shape)",
      (slug) => {
        expect(qualifiesForFrameWarranty(slug)).toBe(true);
      },
    );
  });

  describe("mixed-collection conflict invariant", () => {
    // Higher-level invariant: the slug-shape gate is the FIRST line of
    // defense. The intended cf-g640.fu5 follow-up is a runtime check
    // against product.collectionIds. This test pins the contract a
    // future runtime helper must satisfy: ANY slug that contains both
    // a frame token AND a mattress/cover token returns FALSE.
    it("rejects any slug containing both a frame token AND a mattress token", () => {
      const frameTokens = ["futon", "murphy", "platform-bed", "sofa-bed"];
      const conflictTokens = ["mattress", "cover", "slipcover"];
      for (const frame of frameTokens) {
        for (const conflict of conflictTokens) {
          const slug = `${frame}-${conflict}`;
          expect(qualifiesForFrameWarranty(slug)).toBe(false);
        }
      }
    });
  });
});

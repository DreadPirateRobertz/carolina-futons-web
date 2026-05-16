import { describe, it, expect } from "vitest";

import {
  flagSuspiciousMattressMembership,
  isStandaloneMattress,
  looksLikeFrameByShape,
} from "@/lib/product/warranty-gate";

// cf-g640 reviewer-driven test suite (5-agent CR on PR #658).
// Pins the FAIL-CLOSED posture for the PDP frame-warranty gate so a
// future refactor can't silently flip the indeterminate-state default
// from "suppress" back to "render frame warranty on mattresses during
// Wix outage."

describe("isStandaloneMattress — positive (real mattress)", () => {
  it("returns true when product is a member of the mattresses collection", () => {
    expect(
      isStandaloneMattress(
        { collectionIds: ["col-mattresses"] },
        { _id: "col-mattresses" },
      ),
    ).toBe(true);
  });

  it("returns true when product is in mattresses + other collections", () => {
    expect(
      isStandaloneMattress(
        { collectionIds: ["col-sale", "col-mattresses", "col-spring-promo"] },
        { _id: "col-mattresses" },
      ),
    ).toBe(true);
  });
});

describe("isStandaloneMattress — negative (real frame, bundle, etc.)", () => {
  it("returns false when product is a frame (not in mattresses)", () => {
    expect(
      isStandaloneMattress(
        { collectionIds: ["col-futon-frames"] },
        { _id: "col-mattresses" },
      ),
    ).toBe(false);
  });

  it("returns false for a frame+mattress bundle (lives in futon-frames, not mattresses)", () => {
    // The disambiguation that drove the helper extraction: a futon
    // SKU that bundles a mattress is a FRAME product (frame portion
    // is what's warranted as 15-year). It must NOT be classified as
    // a standalone mattress.
    expect(
      isStandaloneMattress(
        { collectionIds: ["col-futon-frames", "col-bundles"] },
        { _id: "col-mattresses" },
      ),
    ).toBe(false);
  });

  it("returns false when product has an empty collectionIds array", () => {
    // Empty array is a DETERMINATE 'not in mattresses' — distinct
    // from undefined (indeterminate / orphan).
    expect(
      isStandaloneMattress(
        { collectionIds: [] },
        { _id: "col-mattresses" },
      ),
    ).toBe(false);
  });
});

describe("isStandaloneMattress — FAIL-CLOSED on indeterminate state (cf-g640 reviewer-driven)", () => {
  it("returns true when mattressesCollection is null (Wix outage / slug rename / auth expiry)", () => {
    // 3 of 5 PR #658 reviewers (code-reviewer, silent-failure-hunter,
    // pr-test-analyzer) converged on this case: fail-open would
    // restore the exact pre-cf-g640 bug during Wix degradation.
    expect(
      isStandaloneMattress({ collectionIds: ["col-mattresses"] }, null),
    ).toBe(true);
  });

  it("returns true when mattressesCollection._id is missing", () => {
    expect(
      isStandaloneMattress({ collectionIds: ["col-mattresses"] }, {}),
    ).toBe(true);
  });

  it("returns true when mattressesCollection._id is explicit null", () => {
    expect(
      isStandaloneMattress({ collectionIds: ["col-mattresses"] }, { _id: null }),
    ).toBe(true);
  });

  it("returns true when product.collectionIds is undefined (orphan product)", () => {
    // Wix Stores allows products created without collection assignment
    // during catalog rebuilds. We cannot prove the product is NOT a
    // mattress → suppress (legal-exposure-conservative).
    expect(
      isStandaloneMattress({}, { _id: "col-mattresses" }),
    ).toBe(true);
  });

  it("returns true when BOTH collection lookup failed AND product is orphan", () => {
    expect(isStandaloneMattress({}, null)).toBe(true);
  });
});

// cf-tmdb (cf-g640.fu4): merchandiser-mistake operator signal.
// isStandaloneMattress correctly SUPPRESSES the warranty section when
// a product is mis-tagged into mattresses; these helpers + the wiring
// in page.tsx surface the bug to on-call so it gets fixed in the CMS,
// not just papered over by the silent gate.

describe("looksLikeFrameByShape — frame-shape token detector", () => {
  it.each([
    "kingston-futon-frame",
    "cambridge-futon",
    "aspen-murphy-bed",
    "lowline-platform-bed-queen",
    "cody-sofa-bed",
    "urban-sofabed",
    "cody-loveseat",
  ])("returns true for frame-shape slug %s", (slug) => {
    expect(looksLikeFrameByShape(slug)).toBe(true);
  });

  it.each([
    "mesa-1000-mattress",
    "mesa-3000-mattress",
    "organic-cotton-mattress",
    "twin-mattress-cover",
    "herringbone-slipcover",
    "bedside-lamp",
    "gift-card-50",
  ])("returns false for non-frame slug %s", (slug) => {
    expect(looksLikeFrameByShape(slug)).toBe(false);
  });

  it("returns false for empty/whitespace input (defensive)", () => {
    expect(looksLikeFrameByShape("")).toBe(false);
  });

  it("is case-insensitive on token match", () => {
    expect(looksLikeFrameByShape("KINGSTON-FUTON-FRAME")).toBe(true);
    expect(looksLikeFrameByShape("Mesa-1000-Mattress")).toBe(false);
  });

  it("does NOT match the bare 'bed' token (too noisy — mattresses use it too)", () => {
    expect(looksLikeFrameByShape("bed-pillow-topper")).toBe(false);
    expect(looksLikeFrameByShape("queen-bed-skirt")).toBe(false);
  });
});

describe("flagSuspiciousMattressMembership — merchandiser-mistake signal", () => {
  const mattresses = { _id: "col-mattresses" };

  it("fires when product is in mattresses AND slug looks like a frame", () => {
    // The cf-tmdb threat case: "Kingston Futon Frame" tagged into
    // the mattresses collection by mistake. isStandaloneMattress
    // returns true (suppresses warranty) but the slug shape says it's
    // almost certainly a frame. On-call needs the signal.
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-mattresses"] },
        mattresses,
        "kingston-futon-frame",
      ),
    ).toBe(true);
  });

  it("fires for a bundle-shape slug also in mattresses", () => {
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-mattresses"] },
        mattresses,
        "cody-loveseat",
      ),
    ).toBe(true);
  });

  it("does NOT fire for a legitimate mattress (mattress slug + in mattresses)", () => {
    // Real mattress — slug doesn't carry frame tokens. No conflict.
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-mattresses"] },
        mattresses,
        "mesa-3000-mattress",
      ),
    ).toBe(false);
  });

  it("does NOT fire for a frame NOT in mattresses (the happy path)", () => {
    // Frame product, correctly tagged. No suppression, no signal.
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-futon-frames"] },
        mattresses,
        "kingston-futon-frame",
      ),
    ).toBe(false);
  });

  it("does NOT fire for a futon-with-mattress bundle (in futon-frames AND has mattress in name)", () => {
    // Bundle SKUs live in futon-frames (NOT mattresses) — the gate's
    // bundle-correctness pin from the existing cf-g640 suite. Signal
    // must respect that — it fires ONLY when isStandaloneMattress
    // returns true.
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-futon-frames"] },
        mattresses,
        "cody-loveseat-with-mattress",
      ),
    ).toBe(false);
  });

  it("fires under fail-closed indeterminate state IF slug shape qualifies", () => {
    // Indeterminate state (mattressesCollection is null) → isStandalone
    // returns true → if slug shape ALSO qualifies, the suspicion is
    // valid. On-call should see "Wix outage AND frame-shaped slug —
    // investigate whether the membership data is correct."
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-futon-frames"] },
        null,
        "kingston-futon-frame",
      ),
    ).toBe(true);
  });

  it("does NOT fire under indeterminate state for non-frame slug", () => {
    // Indeterminate + non-frame slug — could be a real mattress
    // during an outage. No signal warranted.
    expect(
      flagSuspiciousMattressMembership(
        { collectionIds: ["col-futon-frames"] },
        null,
        "mesa-3000-mattress",
      ),
    ).toBe(false);
  });
});

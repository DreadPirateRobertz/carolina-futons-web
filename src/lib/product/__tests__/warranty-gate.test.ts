import { describe, it, expect } from "vitest";

import { isStandaloneMattress } from "@/lib/product/warranty-gate";

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

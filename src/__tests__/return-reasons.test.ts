// cfw-0nt: closed-enum vocabulary for return reasons. Tests pin parity
// with the Wix backend constants and the runtime type-guard semantics.

import { describe, it, expect } from "vitest";

import {
  REASON_LABELS,
  VALID_REASONS,
  isValidReason,
} from "@/lib/returns/return-reasons";

describe("VALID_REASONS + REASON_LABELS", () => {
  it("matches the Wix backend vocabulary one-for-one (no drift)", () => {
    // Mirror copy of the Wix `VALID_REASONS` constant from
    // ~/gt/cfutons/src/backend/returnsService.web.js — admins reading
    // moderator queue across both systems need 1:1 reason parity.
    const wixSpec = [
      "wrong_size",
      "wrong_color",
      "defective",
      "damaged_in_shipping",
      "not_as_described",
      "changed_mind",
      "found_better_price",
      "other",
    ];
    expect([...VALID_REASONS]).toEqual(wixSpec);
  });

  it("provides a human label for every reason", () => {
    for (const r of VALID_REASONS) {
      expect(REASON_LABELS[r]).toBeTruthy();
      expect(typeof REASON_LABELS[r]).toBe("string");
    }
  });
});

describe("isValidReason guard", () => {
  it("returns true for every valid reason", () => {
    for (const r of VALID_REASONS) {
      expect(isValidReason(r)).toBe(true);
    }
  });

  it("returns false for an unknown reason string", () => {
    expect(isValidReason("absolutely_not_a_reason")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidReason("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isValidReason(null)).toBe(false);
    expect(isValidReason(undefined)).toBe(false);
    expect(isValidReason(42)).toBe(false);
    expect(isValidReason({})).toBe(false);
    expect(isValidReason([])).toBe(false);
  });
});

// cfw-80n1: closed-enum vocabulary for warranty-claim issue types.
// Tests pin parity with Wix backend constants and runtime guard semantics.

import { describe, it, expect } from "vitest";

import {
  ISSUE_TYPE_LABELS,
  VALID_ISSUE_TYPES,
  isValidIssueType,
} from "@/lib/warranty/warranty-issue-types";

describe("VALID_ISSUE_TYPES + ISSUE_TYPE_LABELS", () => {
  it("matches the Wix backend vocabulary one-for-one (no drift)", () => {
    // Mirror copy of the Wix `VALID_ISSUE_TYPES` constant from
    // ~/gt/cfutons/src/backend/warrantyService.web.js — admins reviewing
    // claims across both systems need 1:1 issue-type parity.
    const wixSpec = [
      "structural",
      "fabric",
      "mechanism",
      "accidental",
      "stain",
      "other",
    ];
    expect([...VALID_ISSUE_TYPES]).toEqual(wixSpec);
  });

  it("provides a human label for every issue type", () => {
    for (const t of VALID_ISSUE_TYPES) {
      expect(ISSUE_TYPE_LABELS[t]).toBeTruthy();
      expect(typeof ISSUE_TYPE_LABELS[t]).toBe("string");
    }
  });
});

describe("isValidIssueType guard", () => {
  it("returns true for every valid issue type", () => {
    for (const t of VALID_ISSUE_TYPES) {
      expect(isValidIssueType(t)).toBe(true);
    }
  });

  it("returns false for an unknown string", () => {
    expect(isValidIssueType("absolutely_not_a_type")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidIssueType("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isValidIssueType(null)).toBe(false);
    expect(isValidIssueType(undefined)).toBe(false);
    expect(isValidIssueType(42)).toBe(false);
    expect(isValidIssueType({})).toBe(false);
    expect(isValidIssueType([])).toBe(false);
  });
});

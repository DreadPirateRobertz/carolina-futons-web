// cfw-qsg: structural invariants for src/lib/registry/registry-types.ts.
// The RegistryOccasion union (TS) enforces that every consumer accepts
// every member, but does NOT prevent OCCASION_LABELS from drifting:
// dropping a key (some occasion has no label and falls through to "")
// or keeping a stale key after the union narrows.

import { describe, it, expect } from "vitest";

import {
  OCCASION_LABELS,
  type RegistryOccasion,
} from "@/lib/registry/registry-types";

const OCCASIONS: ReadonlyArray<RegistryOccasion> = [
  "wedding",
  "housewarming",
  "dorm",
  "baby",
  "holiday",
  "other",
];

describe("OCCASION_LABELS — RegistryOccasion → display label", () => {
  it("has exactly the 6 RegistryOccasion union members as keys", () => {
    expect(Object.keys(OCCASION_LABELS).sort()).toEqual([...OCCASIONS].sort());
  });

  it.each(OCCASIONS)("%s label is a non-empty trimmed string", (occ) => {
    expect(OCCASION_LABELS[occ].trim().length).toBeGreaterThan(0);
  });

  it("no two occasions resolve to the same display label", () => {
    const labels = Object.values(OCCASION_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("'wedding' surfaces 'Wedding' (regression guard against silent rename)", () => {
    // The dropdown ordering is alphabetical-by-label in the registry create
    // form; renaming 'Wedding' to 'Marriage' would silently reorder the
    // form and break analytics dashboards keyed on the label string.
    expect(OCCASION_LABELS.wedding).toBe("Wedding");
  });

  it("'other' surfaces a non-empty fallback (catch-all category never shows blank)", () => {
    expect(OCCASION_LABELS.other.trim().length).toBeGreaterThan(0);
  });
});

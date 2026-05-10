// cfw-hxu: structural invariants for src/lib/design-a-room/steps.ts.
// Pure data — failure mode is a typo (empty title/body), bad dimensions,
// or DEFAULT_FUTON_IDX out of bounds because someone reordered
// FUTON_OPTIONS. Tests pin the contract the planner UI relies on.

import { describe, it, expect } from "vitest";

import {
  DESIGN_STEPS,
  DEFAULT_FUTON_IDX,
  FUTON_OPTIONS,
} from "@/lib/design-a-room/steps";

describe("DESIGN_STEPS — 'how it works' panel data", () => {
  it("contains exactly 3 entries (UI is grid-of-3)", () => {
    expect(DESIGN_STEPS).toHaveLength(3);
  });

  it.each(DESIGN_STEPS)("step has non-empty title + body — $title", (step) => {
    expect(step.title.trim().length).toBeGreaterThan(0);
    expect(step.body.trim().length).toBeGreaterThan(0);
  });

  it("titles are unique (no duplicate cards)", () => {
    const titles = DESIGN_STEPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("FUTON_OPTIONS — planner footprint dimensions", () => {
  it("is non-empty", () => {
    expect(FUTON_OPTIONS.length).toBeGreaterThan(0);
  });

  it.each(FUTON_OPTIONS)(
    "every option has positive widthIn + depthIn — $shortLabel",
    (opt) => {
      expect(opt.widthIn).toBeGreaterThan(0);
      expect(opt.depthIn).toBeGreaterThan(0);
    },
  );

  it.each(FUTON_OPTIONS)("every option has non-empty label + shortLabel — $shortLabel", (opt) => {
    expect(opt.label.trim().length).toBeGreaterThan(0);
    expect(opt.shortLabel.trim().length).toBeGreaterThan(0);
  });

  it("all labels are unique (planner uses label for Map keys / dropdown ids)", () => {
    const labels = FUTON_OPTIONS.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("all shortLabels are unique (legend / chip text in the planner)", () => {
    const shorts = FUTON_OPTIONS.map((o) => o.shortLabel);
    expect(new Set(shorts).size).toBe(shorts.length);
  });

  it("twin/full/queen futon widths follow the documented ascending order", () => {
    // The first three options are documented as Twin (38) / Full (54) /
    // Queen (60). A reorder that breaks this would put Queen before Twin
    // in the dropdown and confuse Brenda's customers — pin the order.
    const futons = FUTON_OPTIONS.filter((o) =>
      o.shortLabel.includes("futon"),
    );
    expect(futons).toHaveLength(3);
    const widths = futons.map((o) => o.widthIn);
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });

  it("dimensions look like inches, not feet (planner divides by 12 elsewhere)", () => {
    // A worst-case 95"-wide queen-murphy is plausible. Anything ≤ 8 would
    // be feet — pin the unit so a future drift surfaces here.
    for (const opt of FUTON_OPTIONS) {
      expect(opt.widthIn).toBeGreaterThan(20);
      expect(opt.depthIn).toBeGreaterThan(20);
    }
  });
});

describe("DEFAULT_FUTON_IDX", () => {
  it("is a valid index into FUTON_OPTIONS (no out-of-bounds default)", () => {
    expect(DEFAULT_FUTON_IDX).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_FUTON_IDX).toBeLessThan(FUTON_OPTIONS.length);
  });

  it("resolves to a real option (sanity)", () => {
    expect(FUTON_OPTIONS[DEFAULT_FUTON_IDX]).toBeDefined();
    expect(FUTON_OPTIONS[DEFAULT_FUTON_IDX].widthIn).toBeGreaterThan(0);
  });
});

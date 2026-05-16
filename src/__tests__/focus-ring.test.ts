// cf-nm9p: pin the focus-ring constants verbatim. Convention drift
// (someone removes ring-offset-2, swaps ring-2 → ring-1, etc) fails
// loudly here instead of producing inconsistent rings across 25+
// callsites.

import { describe, it, expect } from "vitest";

import {
  focusRingCta,
  focusRingEspresso,
  focusRingNavy,
  focusRingWhite,
} from "@/lib/ui/focus-ring";

describe("focus-ring constants (cf-nm9p / cf-2oku.fu1)", () => {
  it("focusRingCta is the cf-cta quartet with ring-offset-2", () => {
    expect(focusRingCta).toBe(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
    );
  });

  it("focusRingEspresso swaps the color to cf-espresso", () => {
    expect(focusRingEspresso).toBe(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2",
    );
  });

  it("focusRingWhite has NO ring-offset (dark hero — offset would clip the surface)", () => {
    expect(focusRingWhite).toBe(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
    );
    // Negative assertion: dark-surface ring should NOT have ring-offset
    // because the offset uses the body's bg-background color, which on
    // a dark hero would be invisible (it'd cut the ring's contrast).
    expect(focusRingWhite).not.toMatch(/ring-offset/);
  });

  it("focusRingNavy is the cf-navy quartet with ring-offset-2", () => {
    expect(focusRingNavy).toBe(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy focus-visible:ring-offset-2",
    );
  });

  describe("convention invariants", () => {
    it.each([
      ["focusRingCta", focusRingCta],
      ["focusRingEspresso", focusRingEspresso],
      ["focusRingWhite", focusRingWhite],
      ["focusRingNavy", focusRingNavy],
    ])("%s strips outline (focus-visible:outline-none present)", (_, ring) => {
      expect(ring).toContain("focus-visible:outline-none");
    });

    it.each([
      ["focusRingCta", focusRingCta],
      ["focusRingEspresso", focusRingEspresso],
      ["focusRingWhite", focusRingWhite],
      ["focusRingNavy", focusRingNavy],
    ])("%s uses ring-2 width (not ring-1, not ring-4)", (_, ring) => {
      expect(ring).toContain("focus-visible:ring-2");
      // Negative assertions catch silent narrowing.
      expect(ring).not.toMatch(/focus-visible:ring-1(?!\d)/);
      expect(ring).not.toMatch(/focus-visible:ring-4(?!\d)/);
    });
  });
});

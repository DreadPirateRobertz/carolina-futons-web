// cfw-dve: cross-file dedupe guard for MascotPalette. V3_PAL is exported
// from BOTH src/components/mascot/MascotPalette.ts AND
// src/components/theme-a/MascotPalette.ts. They must stay byte-equal
// until someone intentionally diverges them; without a test, a value
// tweak in one would silently mismatch on the surfaces consuming the
// other and produce off-brand colors only on certain pages.
//
// Plus per-file hex-shape invariants for V3_PAL + V3_NIGHT.

import { describe, it, expect } from "vitest";

import { V3_PAL as MASCOT_PAL, V3_NIGHT } from "@/components/mascot/MascotPalette";
import { V3_PAL as THEME_A_PAL } from "@/components/theme-a/MascotPalette";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("V3_PAL — cross-file consistency", () => {
  it("both copies have identical key sets", () => {
    const mascotKeys = Object.keys(MASCOT_PAL).sort();
    const themeAKeys = Object.keys(THEME_A_PAL).sort();
    expect(themeAKeys).toEqual(mascotKeys);
  });

  it("both copies have identical values for every key", () => {
    // Pinning the values rather than just keys catches a one-character
    // hex drift in either file (e.g. #2A1810 → #2B1810 — visually
    // indistinguishable in code review but ships off-brand brown to
    // every theme-a mascot).
    for (const key of Object.keys(MASCOT_PAL) as Array<keyof typeof MASCOT_PAL>) {
      expect(
        THEME_A_PAL[key as keyof typeof THEME_A_PAL],
        `theme-a V3_PAL.${String(key)} drifts from mascot V3_PAL`,
      ).toBe(MASCOT_PAL[key]);
    }
  });
});

describe("V3_PAL (mascot/) — hex shape", () => {
  it.each(Object.entries(MASCOT_PAL))(
    "%s = %s is a #RRGGBB hex",
    (_key, value) => {
      expect(value).toMatch(HEX);
    },
  );

  it("has the documented foundation tokens (regression guard against silent drop)", () => {
    expect(MASCOT_PAL.ink).toBeDefined();
    expect(MASCOT_PAL.paper).toBeDefined();
    expect(MASCOT_PAL.bearFur).toBeDefined();
    expect(MASCOT_PAL.cream).toBeDefined();
  });
});

describe("V3_PAL (theme-a/) — hex shape", () => {
  it.each(Object.entries(THEME_A_PAL))(
    "%s = %s is a #RRGGBB hex",
    (_key, value) => {
      expect(value).toMatch(HEX);
    },
  );
});

describe("V3_NIGHT — hex shape", () => {
  it.each(Object.entries(V3_NIGHT))(
    "%s = %s is a #RRGGBB hex",
    (_key, value) => {
      expect(value).toMatch(HEX);
    },
  );

  it("has the documented night-scene tokens (sky/star/moon/fur)", () => {
    expect(V3_NIGHT.sky0).toBeDefined();
    expect(V3_NIGHT.star).toBeDefined();
    expect(V3_NIGHT.moon).toBeDefined();
    expect(V3_NIGHT.fur).toBeDefined();
  });

  it("V3_NIGHT.fur is lighter than V3_PAL.bearFur (so bear reads against dark ridges)", () => {
    // Pinned per the file's own comment. A casual "let's match the
    // day-mode bear" change would make the moonlit bear blend into the
    // night-sky ridges. We compare luminance via a cheap RGB sum — not
    // perceptually correct but enough to fail-loudly on inversion.
    const sumOf = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return r + g + b;
    };
    expect(sumOf(V3_NIGHT.fur)).toBeGreaterThan(sumOf(MASCOT_PAL.bearFur));
  });
});

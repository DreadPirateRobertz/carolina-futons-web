// cfw-8t5: coverage for src/lib/illustrations/living-sky.ts. 410-line
// pure engine for the Phase 7 Living Blue Ridge Sky illustration. The
// file's header says "table values and interpolation behavior are
// identical so the visual contract matches the Wix Studio site
// exactly" — pin enough of that contract to fail CI on a casual
// table edit, without copying the entire keyframe table into the
// test (which would defeat the purpose of having ONE source of truth).

import { describe, it, expect } from "vitest";

import {
  MIDNIGHT_MINUTES,
  NOON_MINUTES,
  computeLivingSky,
  getSeason,
  totalMinutesNow,
} from "@/lib/illustrations/living-sky";

describe("constants", () => {
  it("NOON_MINUTES = 720 (12:00 — used as SSR + reduced-motion fallback)", () => {
    expect(NOON_MINUTES).toBe(720);
  });

  it("MIDNIGHT_MINUTES = 0 (used when site dark mode is active)", () => {
    expect(MIDNIGHT_MINUTES).toBe(0);
  });

  it("NOON_MINUTES is exactly 12 hours past MIDNIGHT_MINUTES", () => {
    expect(NOON_MINUTES - MIDNIGHT_MINUTES).toBe(12 * 60);
  });
});

describe("getSeason — month-based detection", () => {
  it.each([
    [0, "winter"], // Jan
    [1, "winter"], // Feb
    [2, "spring"], // Mar
    [3, "spring"], // Apr
    [4, "spring"], // May
    [5, "summer"], // Jun
    [6, "summer"], // Jul
    [7, "summer"], // Aug
    [8, "fall"], // Sep
    [9, "fall"], // Oct
    [10, "fall"], // Nov
    [11, "winter"], // Dec
  ])("month index %d → %s", (monthIdx, expected) => {
    const d = new Date(2026, monthIdx, 15);
    expect(getSeason(d)).toBe(expected);
  });

  it("default param uses current Date when no arg passed", () => {
    // Just verify it returns one of the four seasons — actual value
    // depends on test runtime.
    const out = getSeason();
    expect(["spring", "summer", "fall", "winter"]).toContain(out);
  });
});

describe("totalMinutesNow", () => {
  it("midnight (00:00) → 0", () => {
    expect(totalMinutesNow(new Date(2026, 0, 1, 0, 0))).toBe(0);
  });

  it("noon (12:00) → 720", () => {
    expect(totalMinutesNow(new Date(2026, 0, 1, 12, 0))).toBe(720);
  });

  it("13:30 → 810", () => {
    expect(totalMinutesNow(new Date(2026, 0, 1, 13, 30))).toBe(810);
  });

  it("23:59 → 1439 (last minute of the day)", () => {
    expect(totalMinutesNow(new Date(2026, 0, 1, 23, 59))).toBe(1439);
  });

  it("default param uses current Date when no arg passed", () => {
    const out = totalMinutesNow();
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThan(1440);
    expect(Number.isInteger(out)).toBe(true);
  });
});

describe("computeLivingSky — input validation", () => {
  it.each([
    ["NaN", NaN],
    ["positive Infinity", Infinity],
    ["negative Infinity", -Infinity],
  ])("throws TypeError on %s", (_label, val) => {
    expect(() => computeLivingSky(val)).toThrow(TypeError);
    expect(() => computeLivingSky(val)).toThrow(/finite number/);
  });

  it("throws TypeError on a non-number input (cast)", () => {
    expect(() =>
      computeLivingSky("noon" as unknown as number),
    ).toThrow(TypeError);
  });
});

describe("computeLivingSky — minute wrapping", () => {
  // Pure function, deterministic when `now` is fixed. Same wrapped
  // minutes ⇒ same output (modulo daily-wrap edge cases).
  const fixedDate = new Date(2026, 5, 15); // mid-summer

  function fingerprint(state: ReturnType<typeof computeLivingSky>) {
    // Compare a stable fingerprint that excludes the season-dependent
    // ridge colors (those legitimately differ when `now` differs).
    return JSON.stringify({
      sun: state.sunPos,
      sky: state.skyColors,
      starOp: state.starOpacity,
      birdOp: state.birdOpacity,
    });
  }

  it("wraps 1440 → 0 (start of next day)", () => {
    expect(fingerprint(computeLivingSky(1440, { now: fixedDate }))).toBe(
      fingerprint(computeLivingSky(0, { now: fixedDate })),
    );
  });

  it("wraps 1500 → 60 (1:00 AM)", () => {
    expect(fingerprint(computeLivingSky(1500, { now: fixedDate }))).toBe(
      fingerprint(computeLivingSky(60, { now: fixedDate })),
    );
  });

  it("wraps -60 → 1380 (23:00 prior day)", () => {
    expect(fingerprint(computeLivingSky(-60, { now: fixedDate }))).toBe(
      fingerprint(computeLivingSky(1380, { now: fixedDate })),
    );
  });

  it("wraps deeply negative -1500 → 1380 (same as -60 mod 1440)", () => {
    expect(fingerprint(computeLivingSky(-1500, { now: fixedDate }))).toBe(
      fingerprint(computeLivingSky(1380, { now: fixedDate })),
    );
  });
});

describe("computeLivingSky — isCFPlus shift", () => {
  const fixedDate = new Date(2026, 5, 15);

  it("isCFPlus=true at 13:00 (780min) returns same state as isCFPlus=false at 12:00 (720min)", () => {
    // CFPlus shifts the effective time by -60 minutes — so at wall
    // clock 13:00 a CFPlus member sees the noon state.
    const cfPlus = computeLivingSky(780, { isCFPlus: true, now: fixedDate });
    const baseline = computeLivingSky(720, { isCFPlus: false, now: fixedDate });

    expect(cfPlus.sunPos).toEqual(baseline.sunPos);
    expect(cfPlus.skyColors).toEqual(baseline.skyColors);
    expect(cfPlus.starOpacity).toBe(baseline.starOpacity);
  });

  it("isCFPlus=true at 0:00 wraps the -60 shift (yesterday's 23:00)", () => {
    const cfPlus = computeLivingSky(0, { isCFPlus: true, now: fixedDate });
    const baseline = computeLivingSky(1380, { isCFPlus: false, now: fixedDate });

    expect(cfPlus.sunPos).toEqual(baseline.sunPos);
  });

  it("default isCFPlus is false (no shift)", () => {
    const explicit = computeLivingSky(720, { isCFPlus: false, now: fixedDate });
    const omitted = computeLivingSky(720, { now: fixedDate });
    expect(omitted).toEqual(explicit);
  });
});

describe("computeLivingSky — output shape", () => {
  const summerNoon = computeLivingSky(NOON_MINUTES, {
    now: new Date(2026, 5, 15),
  });

  it("returns the documented 4-string skyColors tuple", () => {
    expect(summerNoon.skyColors).toHaveLength(4);
    for (const c of summerNoon.skyColors) {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it("returns the documented 2-string glowColors tuple", () => {
    expect(summerNoon.glowColors).toHaveLength(2);
  });

  it("returns ridgeColors with 5 named layers (r1-r4 + tree)", () => {
    expect(Object.keys(summerNoon.ridgeColors).sort()).toEqual(
      ["r1", "r2", "r3", "r4", "tree"].sort(),
    );
  });

  it("season is one of the four documented values", () => {
    expect(["spring", "summer", "fall", "winter"]).toContain(summerNoon.season);
  });

  it("precipitationType is 'snow', 'mist', or 'none'", () => {
    expect(["snow", "mist", "none"]).toContain(summerNoon.precipitationType);
  });
});

describe("computeLivingSky — visual contract spot checks", () => {
  it("noon: sun is up (positive sunPos.opacity), no stars (0 starOpacity)", () => {
    const state = computeLivingSky(NOON_MINUTES, {
      now: new Date(2026, 5, 15),
    });
    expect(state.sunPos.opacity).toBeGreaterThan(0);
    expect(state.starOpacity).toBe(0);
  });

  it("midnight: sun is gone (0 sunPos.opacity), stars are out (positive starOpacity)", () => {
    const state = computeLivingSky(MIDNIGHT_MINUTES, {
      now: new Date(2026, 5, 15),
    });
    expect(state.sunPos.opacity).toBe(0);
    expect(state.starOpacity).toBeGreaterThan(0);
  });

  it("midnight: fireflies + owl are out (positive opacities)", () => {
    const state = computeLivingSky(MIDNIGHT_MINUTES, {
      now: new Date(2026, 5, 15),
    });
    expect(state.fireflyOpacity).toBeGreaterThan(0);
    expect(state.owlOpacity).toBeGreaterThan(0);
  });

  it("season is set from the `now` option, not the time-of-day input", () => {
    // Same wall-clock minute, different `now` dates — only season
    // should change.
    const summer = computeLivingSky(NOON_MINUTES, {
      now: new Date(2026, 5, 15), // June
    });
    const winter = computeLivingSky(NOON_MINUTES, {
      now: new Date(2026, 0, 15), // January
    });
    expect(summer.season).toBe("summer");
    expect(winter.season).toBe("winter");
  });
});

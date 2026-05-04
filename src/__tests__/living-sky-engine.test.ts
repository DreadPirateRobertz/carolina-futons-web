import { describe, it, expect } from "vitest";

import {
  getSeason,
  MIDNIGHT_MINUTES,
  NOON_MINUTES,
  totalMinutesNow,
  computeLivingSky,
} from "@/lib/illustrations/living-sky";

// cf-93rb-livingsky-dynamic: engine port — verifies the 16-keyframe
// interpolation behaves the same way the original Velo
// src/public/living-sky.js did. Tests fix `now` to a stable summer
// date so season-dependent ridge color shifts don't introduce
// flakiness.

const SUMMER_NOW = new Date("2026-07-15T12:00:00Z");
const baseOpts = { now: SUMMER_NOW } as const;

describe("getSeason", () => {
  it.each([
    [new Date("2026-01-15"), "winter"],
    [new Date("2026-03-15"), "spring"],
    [new Date("2026-04-15"), "spring"],
    [new Date("2026-06-15"), "summer"],
    [new Date("2026-08-15"), "summer"],
    [new Date("2026-09-15"), "fall"],
    [new Date("2026-11-15"), "fall"],
    [new Date("2026-12-15"), "winter"],
  ])("classifies %s as %s", (date, expected) => {
    expect(getSeason(date)).toBe(expected);
  });
});

describe("computeLivingSky — input validation", () => {
  it("throws TypeError on non-finite minutes", () => {
    expect(() => computeLivingSky(NaN, baseOpts)).toThrow(TypeError);
    expect(() => computeLivingSky(Infinity, baseOpts)).toThrow(TypeError);
  });

  it("throws TypeError on non-number minutes", () => {
    // @ts-expect-error — exercising runtime guard
    expect(() => computeLivingSky("noon", baseOpts)).toThrow(TypeError);
  });

  it("wraps minutes outside [0,1440) using floor-mod", () => {
    const noonState = computeLivingSky(720, baseOpts);
    const wrappedState = computeLivingSky(720 + 1440, baseOpts);
    expect(wrappedState.skyColors).toEqual(noonState.skyColors);
    const negState = computeLivingSky(-720, baseOpts);
    const midnightState = computeLivingSky(720 - 1440 + 1440, baseOpts);
    expect(negState.skyColors).toEqual(midnightState.skyColors);
  });
});

describe("computeLivingSky — keyframe interpolation", () => {
  it("matches the noon keyframe at 12:00 (720 min)", () => {
    const s = computeLivingSky(NOON_MINUTES, baseOpts);
    // Noon keyframe sky[0] = #2858A0; lerp t=0 returns it verbatim.
    expect(s.skyColors[0].toLowerCase()).toBe("#2858a0");
    // Sun fully visible at noon.
    expect(s.sunPos.opacity).toBe(1);
    // No stars at noon.
    expect(s.starOpacity).toBe(0);
    // Cloud opacity zero at noon (clear summer sky).
    expect(s.cloudOpacity).toBe(0);
  });

  it("interpolates between keyframes at intermediate hours", () => {
    // 11:00 falls between the 10:00 and 12:00 keyframes — sun cx
    // should be between sunCX 410 (10h) and sunCX 524 (12h).
    const s = computeLivingSky(11 * 60, baseOpts);
    expect(s.sunPos.cx).toBeGreaterThan(410);
    expect(s.sunPos.cx).toBeLessThan(524);
  });

  it("dawn keyframe (5am) shows partial sun + fading stars", () => {
    const s = computeLivingSky(5 * 60, baseOpts);
    expect(s.sunPos.opacity).toBe(0.65);
    expect(s.starOpacity).toBeCloseTo(0.25);
  });

  it("midnight (0 min) is full night with stars + moon", () => {
    const s = computeLivingSky(0, baseOpts);
    expect(s.starOpacity).toBeCloseTo(0.9);
    expect(s.moonPos.opacity).toBe(1);
    expect(s.sunPos.opacity).toBe(0);
  });

  it("golden hour (17:30 = 1050 min) ramps ridge silhouettes dark", () => {
    // r1 at 17.5h keyframe is #1C0430 — near-black silhouette.
    const s = computeLivingSky(17.5 * 60, baseOpts);
    expect(s.ridgeColors.r1.toLowerCase()).toContain("#1c0430");
  });
});

describe("computeLivingSky — animation hint", () => {
  it("returns 'flicker' when fireflies are out (night with high firefly opacity)", () => {
    // 22:00 keyframe has fireflyOp 0.7 → flicker hint.
    const s = computeLivingSky(22 * 60, baseOpts);
    expect(s.animationHint).toBe("flicker");
  });

  it("returns null on a clear midday sky (no fireflies, no clouds)", () => {
    const s = computeLivingSky(NOON_MINUTES, baseOpts);
    expect(s.animationHint).toBeNull();
  });

  it("returns 'shimmer' when precipitation is active (winter + clouds)", () => {
    const winterNow = new Date("2026-01-15T12:00:00Z");
    // Need cloud opacity > 0 to trigger snow → 7am keyframe has cloudOp 0.7.
    const s = computeLivingSky(7 * 60, { now: winterNow });
    expect(s.precipitationType).toBe("snow");
    expect(s.animationHint).toBe("shimmer");
  });
});

describe("computeLivingSky — CF+ golden-hour perk", () => {
  it("shifts the effective hour 60 minutes earlier when isCFPlus is set", () => {
    const standard = computeLivingSky(18 * 60, baseOpts);
    const cfplus   = computeLivingSky(18 * 60, { ...baseOpts, isCFPlus: true });
    // CF+ user at 18:00 sees the 17:00 state — the rim opacity at 17:00
    // (between 16h and 17.5h) is lower than at 18:00 golden hour peak.
    // We just need to verify they are NOT equal — the CF+ perk shifted.
    expect(cfplus.rimOpacity).not.toBe(standard.rimOpacity);
  });
});

describe("computeLivingSky — seasonal ridge tint", () => {
  it("summer leaves ridge colors at the table value (no shift)", () => {
    // At 12h the table has r1 = #1C4454. Summer should pass through.
    const s = computeLivingSky(NOON_MINUTES, baseOpts);
    expect(s.ridgeColors.r1.toLowerCase()).toContain("#1c4454");
  });

  it("fall warms the near ridge with rgb() output (loses the # prefix)", () => {
    const fallNow = new Date("2026-10-15T12:00:00Z");
    const s = computeLivingSky(NOON_MINUTES, { now: fallNow });
    expect(s.ridgeColors.r1.startsWith("rgb(")).toBe(true);
  });

  it("winter fades the near ridge with rgb() output", () => {
    const winterNow = new Date("2026-12-15T12:00:00Z");
    const s = computeLivingSky(NOON_MINUTES, { now: winterNow });
    expect(s.ridgeColors.r1.startsWith("rgb(")).toBe(true);
  });
});

describe("MIDNIGHT_MINUTES — dark-mode forced night state (cf-wzl3)", () => {
  it("is 0 (midnight)", () => {
    expect(MIDNIGHT_MINUTES).toBe(0);
  });

  it("produces a night sky with stars visible", () => {
    const s = computeLivingSky(MIDNIGHT_MINUTES, baseOpts);
    expect(s.starOpacity).toBeGreaterThan(0.5);
  });

  it("produces a night sky with moon visible", () => {
    const s = computeLivingSky(MIDNIGHT_MINUTES, baseOpts);
    expect(s.moonPos.opacity).toBeGreaterThan(0.5);
  });

  it("produces a night sky with sun hidden", () => {
    const s = computeLivingSky(MIDNIGHT_MINUTES, baseOpts);
    expect(s.sunPos.opacity).toBe(0);
  });

  it("produces a night sky with fireflies visible", () => {
    const s = computeLivingSky(MIDNIGHT_MINUTES, baseOpts);
    expect(s.fireflyOpacity).toBeGreaterThan(0);
  });

  it("differs meaningfully from the noon state (dark vs light)", () => {
    const night = computeLivingSky(MIDNIGHT_MINUTES, baseOpts);
    const noon = computeLivingSky(NOON_MINUTES, baseOpts);
    expect(night.starOpacity).toBeGreaterThan(noon.starOpacity);
    expect(night.sunPos.opacity).toBeLessThan(noon.sunPos.opacity);
  });
});

describe("totalMinutesNow", () => {
  it("returns minutes since midnight from a Date", () => {
    expect(totalMinutesNow(new Date("2026-04-25T00:00:00"))).toBe(0);
    expect(totalMinutesNow(new Date("2026-04-25T12:30:00"))).toBe(750);
    expect(totalMinutesNow(new Date("2026-04-25T23:59:00"))).toBe(1439);
  });
});

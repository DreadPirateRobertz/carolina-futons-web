// cfw-qsg: structural invariants for src/lib/social-embeds.ts. The
// SocialPlatform union (TS) enforces value-level correctness on each
// Record entry, but does NOT prevent: (a) duplicate platform entries
// in SOCIAL_EMBEDS, (b) a profileUrl pointing at the wrong domain
// after a copy-paste error, (c) an embed URL whose shape doesn't
// match the platform's documented embed contract.

import { describe, it, expect } from "vitest";

import {
  PLATFORM_COLORS,
  PLATFORM_NAMES,
  SOCIAL_EMBEDS,
  type SocialPlatform,
} from "@/lib/social-embeds";

const PLATFORMS: ReadonlyArray<SocialPlatform> = [
  "instagram",
  "tiktok",
  "pinterest",
];

describe("SOCIAL_EMBEDS — home-page social feed config", () => {
  it("has one entry per SocialPlatform key (instagram/tiktok/pinterest)", () => {
    expect(SOCIAL_EMBEDS).toHaveLength(PLATFORMS.length);
    const seen = new Set(SOCIAL_EMBEDS.map((e) => e.platform));
    for (const p of PLATFORMS) expect(seen).toContain(p);
  });

  it("platform values are unique (no duplicate Instagram entry silently rendering twice)", () => {
    const platforms = SOCIAL_EMBEDS.map((e) => e.platform);
    expect(new Set(platforms).size).toBe(platforms.length);
  });

  it.each(SOCIAL_EMBEDS)(
    "$platform — label is non-empty and mentions Carolina Futons",
    (entry) => {
      expect(entry.label.trim().length).toBeGreaterThan(0);
      // The label is a screen-reader hint — pin that the brand name is
      // surfaced, not just "Instagram embed" generic text.
      expect(entry.label).toMatch(/Carolina Futons/i);
    },
  );

  it.each(SOCIAL_EMBEDS)("$platform — profileUrl + embedUrl are HTTPS", (entry) => {
    expect(entry.profileUrl).toMatch(/^https:\/\//);
    expect(entry.embedUrl).toMatch(/^https:\/\//);
  });

  it.each(SOCIAL_EMBEDS)(
    "$platform — height is a positive integer (CLS reservation requires layout space)",
    (entry) => {
      expect(Number.isInteger(entry.height)).toBe(true);
      expect(entry.height).toBeGreaterThan(0);
    },
  );

  it("profileUrl domain matches the platform (no copy-paste cross-domain)", () => {
    const expected: Record<SocialPlatform, RegExp> = {
      instagram: /instagram\.com/,
      tiktok: /tiktok\.com/,
      pinterest: /pinterest\.com/,
    };
    for (const entry of SOCIAL_EMBEDS) {
      expect(
        entry.profileUrl,
        `${entry.platform} profileUrl points at the wrong domain: ${entry.profileUrl}`,
      ).toMatch(expected[entry.platform]);
    }
  });

  it("embedUrl shape matches the platform's documented embed contract", () => {
    // Per the file's own comments + each platform's official embed docs.
    const igEntry = SOCIAL_EMBEDS.find((e) => e.platform === "instagram");
    expect(igEntry?.embedUrl).toMatch(/instagram\.com\/p\/[^/]+\/embed/);

    const ttEntry = SOCIAL_EMBEDS.find((e) => e.platform === "tiktok");
    expect(ttEntry?.embedUrl).toMatch(/tiktok\.com\/embed\/v2\/\d+/);

    const ptEntry = SOCIAL_EMBEDS.find((e) => e.platform === "pinterest");
    // Pinterest uses the script widget, not an iframe — pinit.js is the
    // canonical asset.
    expect(ptEntry?.embedUrl).toContain("assets.pinterest.com");
    expect(ptEntry?.embedUrl).toContain("pinit.js");
  });
});

describe("PLATFORM_NAMES — UI display labels", () => {
  it("has exactly the 3 SocialPlatform keys", () => {
    expect(Object.keys(PLATFORM_NAMES).sort()).toEqual([...PLATFORMS].sort());
  });

  it.each(PLATFORMS)("%s display name is non-empty", (p) => {
    expect(PLATFORM_NAMES[p].trim().length).toBeGreaterThan(0);
  });

  it("display names are unique (no two platforms labelled identically)", () => {
    const names = Object.values(PLATFORM_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("PLATFORM_COLORS — placeholder accent hex codes", () => {
  it("has exactly the 3 SocialPlatform keys", () => {
    expect(Object.keys(PLATFORM_COLORS).sort()).toEqual([...PLATFORMS].sort());
  });

  it.each(PLATFORMS)("%s color is a 6-digit #RRGGBB hex", (p) => {
    expect(PLATFORM_COLORS[p]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

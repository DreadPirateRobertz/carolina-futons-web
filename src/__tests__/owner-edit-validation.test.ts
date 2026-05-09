// cfw-6qd.12: defense-in-depth tests for the SiteContent key validator
// shared by /api/admin/site-content and the seed-data contract.

import { describe, it, expect } from "vitest";

import {
  MAX_OWNER_EDIT_KEY_LENGTH,
  SITE_CONTENT_KEY_PATTERN,
  validateOwnerEditKey,
} from "@/lib/cms/owner-edit-validation";

describe("SITE_CONTENT_KEY_PATTERN", () => {
  it.each([
    ["footer.tagline"],
    ["footer.showroom-hours.label"],
    ["footer.copyright.suffix"],
    ["announcement.rotation.0.message"],
    ["announcement.rotation.0.cta-href"],
    ["visit.hours.sun-tue"],
    ["a.b"], // minimum 2 segments
    ["a-b.c-d.e-f"],
  ])("accepts %s", (key) => {
    expect(SITE_CONTENT_KEY_PATTERN.test(key)).toBe(true);
  });

  it.each([
    [""],
    ["footer"], // single segment
    ["Footer.Tagline"], // capitals
    ["footer.Tagline"], // capital in segment
    ["footer.showroomHours"], // camelCase segment
    ["footer..tagline"], // empty segment
    [".footer.tagline"], // leading dot
    ["footer.tagline."], // trailing dot
    ["footer.tagline!"], // special char
    ["footer tagline"], // space
    ["footer.taglinę"], // non-ASCII
    ["footer-.tagline"], // segment ending in hyphen
    ["footer.-tagline"], // segment starting with hyphen
    ["footer/tagline"], // slash
    ["footer.tagline\n"], // trailing newline
  ])("rejects %s", (key) => {
    expect(SITE_CONTENT_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe("validateOwnerEditKey", () => {
  it("accepts a well-formed key and returns it trimmed", () => {
    const result = validateOwnerEditKey("  footer.tagline  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.key).toBe("footer.tagline");
    }
  });

  it("rejects non-string input as 'empty'", () => {
    for (const raw of [undefined, null, 42, {}, [], true]) {
      const result = validateOwnerEditKey(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("empty");
    }
  });

  it("rejects whitespace-only key as 'empty'", () => {
    const result = validateOwnerEditKey("   \t\n  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty");
      expect(result.message).toMatch(/cannot be empty/i);
    }
  });

  it("rejects keys longer than MAX_OWNER_EDIT_KEY_LENGTH as 'too_long'", () => {
    const longKey = "a." + "b".repeat(MAX_OWNER_EDIT_KEY_LENGTH);
    const result = validateOwnerEditKey(longKey);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too_long");
      expect(result.message).toMatch(/256/);
    }
  });

  it("rejects camelCase segments as 'bad_pattern'", () => {
    const result = validateOwnerEditKey("footer.showroomHours");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("bad_pattern");
      expect(result.message).toMatch(/lowercase/i);
    }
  });

  it("rejects single-segment keys (no dot) as 'bad_pattern'", () => {
    const result = validateOwnerEditKey("footer");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_pattern");
  });

  it("rejects empty inner segments as 'bad_pattern'", () => {
    const result = validateOwnerEditKey("footer..tagline");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_pattern");
  });

  it("rejects special characters as 'bad_pattern'", () => {
    const result = validateOwnerEditKey("footer.tagline!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_pattern");
  });

  it("accepts numeric segments (announcement.rotation.0.message pattern)", () => {
    const result = validateOwnerEditKey("announcement.rotation.0.message");
    expect(result.ok).toBe(true);
  });
});

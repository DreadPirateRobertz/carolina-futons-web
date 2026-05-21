// cfw-66o.9: structural validation for the seed-site-content.ts UPSERT script.
// Mirrors the pattern in site-content-seed.test.ts (which covers provision-site-content).
// These tests pin SEED_ROWS so data-entry mistakes (duplicate keys, missing values,
// naming-convention violations) are caught by CI rather than discovered at runtime.

import { describe, it, expect } from "vitest";

import { SITE_CONTENT_KEY_PATTERN } from "@/lib/cms/owner-edit-validation";

import { SEED_ROWS } from "../../scripts/seed-site-content";

describe("seed-site-content SEED_ROWS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SEED_ROWS)).toBe(true);
    expect(SEED_ROWS.length).toBeGreaterThan(0);
  });

  it("contains exactly 66 rows (29 §1 live + 24 §2 proposed + 13 cfw-p3j sustainability)", () => {
    expect(SEED_ROWS).toHaveLength(66);
  });

  it("every row has a non-empty string key and value", () => {
    for (const row of SEED_ROWS) {
      expect(typeof row.key, `row.key type for ${JSON.stringify(row.key)}`).toBe("string");
      expect(row.key.length, `row.key empty`).toBeGreaterThan(0);
      expect(typeof row.value, `row.value type for key=${row.key}`).toBe("string");
      expect(row.value.length, `row.value empty for key=${row.key}`).toBeGreaterThan(0);
    }
  });

  it("all keys are unique", () => {
    const seen = new Set<string>();
    for (const row of SEED_ROWS) {
      expect(seen.has(row.key), `duplicate key: ${row.key}`).toBe(false);
      seen.add(row.key);
    }
  });

  it("all keys follow the dotted-path / lowercase / hyphenated naming convention", () => {
    for (const row of SEED_ROWS) {
      expect(
        SITE_CONTENT_KEY_PATTERN.test(row.key),
        `key "${row.key}" violates SITE_CONTENT_KEY_PATTERN`,
      ).toBe(true);
    }
  });

  it("includes all §1 already-live keys that getSiteContent() callsites depend on", () => {
    const REQUIRED = [
      // Footer
      "footer.tagline",
      "footer.showroom-hours.label",
      "footer.copyright-line",
      // Visit
      "visit.intro.heading",
      "visit.intro.body",
      "visit.location.heading",
      "visit.hours.heading",
      "visit.hours.sun-tue",
      "visit.hours.wed-sat",
      "visit.directions-button.label",
      "visit.cta.heading",
      "visit.cta.body",
      "visit.cta.button-label",
      // Announcement bar
      "announcement.rotation.0.message",
      "announcement.rotation.1.message",
      "announcement.rotation.2.message",
      "announcement.rotation.3.message",
      "announcement.rotation.3.cta-label",
      "announcement.rotation.3.cta-href",
      "announcement.rotation.4.message",
      // Home hero
      "home.filter-first.eyebrow",
      "home.filter-first.headline",
      "home.filter-first.subhead",
      // Home value-props
      "home.value-props.0.title",
      "home.value-props.0.body",
      "home.value-props.1.title",
      "home.value-props.1.body",
      "home.value-props.2.title",
      "home.value-props.2.body",
    ];
    const keys = new Set(SEED_ROWS.map((r) => r.key));
    for (const required of REQUIRED) {
      expect(keys.has(required), `SEED_ROWS missing required §1 key: ${required}`).toBe(true);
    }
  });
});

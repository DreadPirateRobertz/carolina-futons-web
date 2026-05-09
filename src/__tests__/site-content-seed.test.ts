// cfw-roi (cf-atze): structural validation for the SiteContent provisioning
// seed. The provisioner (scripts/provision-site-content/index.mjs) only does
// loose runtime assertions; this test pins the contract so the seed can't
// regress between provisioning runs.
//
// Failures here indicate a problem with the seed file, not the reader. The
// reader (src/lib/cms/site-content.ts) is fail-open and is covered
// separately by site-content.test.ts.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

const SEED_PATH = join(
  __dirname,
  "..",
  "..",
  "scripts",
  "provision-site-content",
  "seed-data.json",
);

type Row = { key: string; value: string };

function loadSeed(): { rows: Row[] } {
  const raw = readFileSync(SEED_PATH, "utf8");
  return JSON.parse(raw);
}

// Mirror the reader's naming convention from
// docs/design/cfw-66o-footer-announce-specs.md §2:
//   lowercase, dotted-path, hyphenated segments
//   e.g. "footer.tagline", "announcement.rotation.0.message"
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

describe("provision-site-content seed-data.json", () => {
  it("parses to a non-empty rows array", () => {
    const seed = loadSeed();
    expect(Array.isArray(seed.rows)).toBe(true);
    expect(seed.rows.length).toBeGreaterThan(0);
  });

  it("contains exactly 20 seed rows (cfw-roi spec)", () => {
    const seed = loadSeed();
    expect(seed.rows).toHaveLength(20);
  });

  it("every row has a non-empty string key and value", () => {
    const seed = loadSeed();
    for (const row of seed.rows) {
      expect(typeof row.key).toBe("string");
      expect(row.key.length).toBeGreaterThan(0);
      expect(typeof row.value).toBe("string");
      expect(row.value.length).toBeGreaterThan(0);
    }
  });

  it("all keys are unique (collection enforces uniqueness; seed must too)", () => {
    const seed = loadSeed();
    const seen = new Set<string>();
    for (const row of seed.rows) {
      expect(seen.has(row.key), `duplicate key: ${row.key}`).toBe(false);
      seen.add(row.key);
    }
  });

  it("all keys follow the dotted-path / lowercase / hyphenated convention", () => {
    const seed = loadSeed();
    for (const row of seed.rows) {
      expect(
        KEY_PATTERN.test(row.key),
        `key "${row.key}" violates the SiteContent naming convention`,
      ).toBe(true);
    }
  });

  it("includes the keys the cfw-66o specs already wired with getSiteContent fallbacks", () => {
    // These keys are already read by Pass-1 refactors (cf-n7ni, cf-h21g,
    // cf-68w4) and need a corresponding row so live values replace the
    // fallback once the collection is provisioned.
    const REQUIRED_KEYS = [
      "footer.tagline",
      "footer.showroom-hours.label",
      "footer.copyright.suffix",
      "visit.hours.sun-tue",
      "visit.hours.wed-sat",
      "announcement.rotation.0.message",
      "announcement.rotation.1.message",
      "announcement.rotation.2.message",
      "announcement.rotation.3.message",
      "announcement.rotation.3.cta-label",
      "announcement.rotation.3.cta-href",
      "announcement.rotation.4.message",
    ];
    const seed = loadSeed();
    const keys = new Set(seed.rows.map((r) => r.key));
    for (const required of REQUIRED_KEYS) {
      expect(keys.has(required), `seed missing required key: ${required}`).toBe(true);
    }
  });
});

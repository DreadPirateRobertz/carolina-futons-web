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

import { SITE_CONTENT_KEY_PATTERN } from "@/lib/cms/owner-edit-validation";

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

// cfw-6qd.12: regex now lives in @/lib/cms/owner-edit-validation so the seed
// test, the runtime endpoint validator, and any future caller share one
// notion of what a valid SiteContent key looks like. Naming convention
// docs: docs/design/cfw-66o-footer-announce-specs.md §2.
const KEY_PATTERN = SITE_CONTENT_KEY_PATTERN;

describe("provision-site-content seed-data.json", () => {
  it("parses to a non-empty rows array", () => {
    const seed = loadSeed();
    expect(Array.isArray(seed.rows)).toBe(true);
    expect(seed.rows.length).toBeGreaterThan(0);
  });

  it("contains exactly 37 seed rows (cfw-roi + cfw-34q value-props + cfw-66o.11 about copy)", () => {
    const seed = loadSeed();
    expect(seed.rows).toHaveLength(37);
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
    // cf-68w4, cfw-9uw) and need a corresponding row so live values replace
    // the fallback once the collection is provisioned.
    const REQUIRED_KEYS = [
      "footer.tagline",
      "footer.showroom-hours.label",
      "footer.copyright-line",
      "visit.hours.sun-tue",
      "visit.hours.wed-sat",
      "announcement.rotation.0.message",
      "announcement.rotation.1.message",
      "announcement.rotation.2.message",
      "announcement.rotation.3.message",
      "announcement.rotation.3.cta-label",
      "announcement.rotation.3.cta-href",
      "announcement.rotation.4.message",
      // cfw-34q: home value-props (cfw-9uw added the reader before the seed
      // had rows; this closes the loop so Brenda can edit them).
      "home.value-props.0.title",
      "home.value-props.0.body",
      "home.value-props.1.title",
      "home.value-props.1.body",
      "home.value-props.2.title",
      "home.value-props.2.body",
      // cfw-66o.11: about page copy — cf-7pk0 F1 wired 11 keys; seed rows
      // close the loop so Brenda can edit the About page from the CMS dashboard.
      "about.intro.eyebrow",
      "about.intro.heading",
      "about.intro.subheading",
      "about.intro.lede",
      "about.beliefs.heading",
      "about.beliefs.body-1",
      "about.beliefs.body-2",
      "about.location.heading",
      "about.location.body-1",
      "about.team.heading",
      "about.team.body",
    ];
    const seed = loadSeed();
    const keys = new Set(seed.rows.map((r) => r.key));
    for (const required of REQUIRED_KEYS) {
      expect(keys.has(required), `seed missing required key: ${required}`).toBe(true);
    }
  });
});

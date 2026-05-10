// cfw-t8r: coverage for src/lib/seo/cities.ts. The SEO city manifest +
// two pure helpers behind every /serving-{city} regional landing page.
// Risks: a duplicate slug makes getCityBySlug return the first match
// silently (others unreachable), distanceMiles drift ships marketing
// copy with the wrong number, proximityLine 0-branch regression sends
// "Just 0 miles from our showroom" to the showroom city itself.

import { describe, it, expect } from "vitest";

import { BUSINESS } from "@/lib/business/contact-info";
import {
  SEO_CITIES,
  getCityBySlug,
  proximityLine,
} from "@/lib/seo/cities";

describe("SEO_CITIES manifest", () => {
  it("is non-empty", () => {
    expect(SEO_CITIES.length).toBeGreaterThan(0);
  });

  it("all slugs are unique", () => {
    const slugs = SEO_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(SEO_CITIES)("slug is kebab-case lowercase — $slug", (c) => {
    expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("Hendersonville is the showroom city with distanceMiles: 0", () => {
    const home = SEO_CITIES.find((c) => c.slug === "hendersonville");
    expect(home).toBeDefined();
    expect(home?.distanceMiles).toBe(0);
    expect(home?.state).toBe("NC");
  });

  it.each(SEO_CITIES)(
    "$slug — distanceMiles is a non-negative integer",
    (c) => {
      expect(Number.isInteger(c.distanceMiles)).toBe(true);
      expect(c.distanceMiles).toBeGreaterThanOrEqual(0);
    },
  );

  it("every state is 'NC' or 'SC' (no cities outside CF service area)", () => {
    for (const c of SEO_CITIES) {
      expect(["NC", "SC"]).toContain(c.state);
    }
  });

  it("SC service area is present (Greenville, Spartanburg, Columbia regression guard)", () => {
    const slugs = new Set(SEO_CITIES.map((c) => c.slug));
    for (const required of ["greenville", "spartanburg", "columbia"]) {
      expect(slugs).toContain(required);
    }
  });

  it("only Hendersonville has distanceMiles: 0 (no duplicate showroom)", () => {
    const zeros = SEO_CITIES.filter((c) => c.distanceMiles === 0);
    expect(zeros).toHaveLength(1);
    expect(zeros[0]?.slug).toBe("hendersonville");
  });
});

describe("getCityBySlug", () => {
  it("returns the matching city for a known lowercase slug", () => {
    const c = getCityBySlug("asheville");
    expect(c).not.toBeNull();
    expect(c?.name).toBe("Asheville");
  });

  it("returns null (NOT undefined) for an unknown slug — pinned ?? null contract", () => {
    const c = getCityBySlug("not-a-real-city");
    expect(c).toBeNull();
    expect(c).not.toBeUndefined();
  });

  it("returns null for an empty string", () => {
    expect(getCityBySlug("")).toBeNull();
  });

  it("matches case-insensitively (uppercase slug resolves to same city)", () => {
    const lower = getCityBySlug("charlotte");
    const upper = getCityBySlug("CHARLOTTE");
    const mixed = getCityBySlug("ChArLoTtE");
    expect(lower).not.toBeNull();
    expect(upper).toEqual(lower);
    expect(mixed).toEqual(lower);
  });

  it("trims whitespace before matching", () => {
    expect(getCityBySlug("  raleigh  ")?.slug).toBe("raleigh");
    expect(getCityBySlug("\tspartanburg\n")?.slug).toBe("spartanburg");
  });

  it("returns null for whitespace-only input", () => {
    expect(getCityBySlug("   ")).toBeNull();
  });

  it("does NOT match by partial substring", () => {
    expect(getCityBySlug("ash")).toBeNull();
    expect(getCityBySlug("asheville-nc")).toBeNull();
  });
});

describe("proximityLine", () => {
  const HENDERSONVILLE = SEO_CITIES.find((c) => c.slug === "hendersonville")!;
  const ASHEVILLE = SEO_CITIES.find((c) => c.slug === "asheville")!;
  const COLUMBIA = SEO_CITIES.find((c) => c.slug === "columbia")!;

  it("distance = 0 → 'Visit our showroom right here in <city>, <state>.'", () => {
    expect(proximityLine(HENDERSONVILLE)).toBe(
      `Visit our showroom right here in ${BUSINESS.city}, ${BUSINESS.state}.`,
    );
  });

  it("distance > 0 → 'Just N miles from our <city> showroom...' with the actual number", () => {
    const line = proximityLine(ASHEVILLE);
    expect(line).toContain(`Just ${ASHEVILLE.distanceMiles} miles`);
    expect(line).toContain(BUSINESS.city);
    expect(line).toContain("showroom");
  });

  it("references BUSINESS.city — no hardcoded 'Hendersonville' in either branch", () => {
    // If a future rebrand moves the showroom, BUSINESS.city is the single
    // source of truth — proximityLine must rely on it, not duplicate the
    // string. Cross-check both branches.
    expect(proximityLine(HENDERSONVILLE)).toContain(BUSINESS.city);
    expect(proximityLine(COLUMBIA)).toContain(BUSINESS.city);
  });

  it("references BUSINESS.state on the showroom (0-distance) line", () => {
    expect(proximityLine(HENDERSONVILLE)).toContain(BUSINESS.state);
  });

  it("uses the city's actual distanceMiles (no off-by-one or miles→km drift)", () => {
    // Spot-check a few known values.
    expect(proximityLine(ASHEVILLE)).toContain(`${ASHEVILLE.distanceMiles}`);
    expect(proximityLine(COLUMBIA)).toContain(`${COLUMBIA.distanceMiles}`);
  });

  it("never produces 'Just 0 miles' (Hendersonville falls into the showroom branch)", () => {
    // Defensive — if the comparison were `>` instead of `=== 0`, a
    // negative-distance bug could route Hendersonville through the wrong
    // branch with the literal "0".
    expect(proximityLine(HENDERSONVILLE)).not.toContain("Just 0 miles");
  });
});

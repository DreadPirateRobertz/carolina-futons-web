import "server-only";

import { getSiteContent } from "@/lib/cms/site-content";

// cfw-15s (mirror of cfutons-side cf-94h): Brenda-editable hero copy for the
// Theme D FilterFirst browse experience. The component is "use client" so
// the server-rendered parents (`src/app/page.tsx`, `src/app/theme-d/page.tsx`)
// read SiteContent and pass the resolved strings as a prop.
//
// Keys conform to SITE_CONTENT_KEY_PATTERN (lowercase + hyphenated, ≥2 dotted
// segments) per cfw-6qd.12, so the owner-edit endpoint accepts Brenda's
// edits without a separate allow-list bump.

/** Fallback copy — the shipped hardcoded strings at the time of refactor. */
const DEFAULTS = {
  eyebrow: "Family owned · Hendersonville, NC",
  headline: "Find your perfect futon",
  subhead:
    "Choose from our selection of high-quality futon frames, bedroom furniture and casegoods, Murphy Cabinet Beds, and craftsman-built futon mattresses for your bed or futon frame.",
} as const;

export type FilterFirstHeroCopy = {
  eyebrow: string;
  headline: string;
  subhead: string;
};

/**
 * Read the three FilterFirst hero strings from the SiteContent CMS, falling
 * back to the shipped defaults when Wix is unreachable, the SiteContent
 * collection hasn't been provisioned, or an individual key is missing.
 *
 * @returns Always-populated copy object. Never throws.
 *
 * WHY: FilterFirst is rendered both on `/` (home) and `/theme-d` (preview),
 * and is a client component. Centralising the loader here keeps the keys + the
 * fallback defaults in one place so the two consumers cannot drift, and so
 * a future third consumer can adopt the same copy with one import.
 */
export async function loadFilterFirstHeroCopy(): Promise<FilterFirstHeroCopy> {
  const [eyebrow, headline, subhead] = await Promise.all([
    getSiteContent("home.filter-first.eyebrow", DEFAULTS.eyebrow),
    getSiteContent("home.filter-first.headline", DEFAULTS.headline),
    getSiteContent("home.filter-first.subhead", DEFAULTS.subhead),
  ]);
  return { eyebrow, headline, subhead };
}

/** Test export — fixture for FilterFirst component tests that don't exercise the loader. */
export const FILTER_FIRST_HERO_DEFAULTS: FilterFirstHeroCopy = DEFAULTS;

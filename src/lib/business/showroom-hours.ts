// cf-7pk0 F2: canonical fetch + inline-sentence composer for the
// showroom hours so /contact + /visit can't drift.
//
// Pre-helper, /contact line 97 hardcoded "Wednesday through Saturday,
// 10 am–5 pm" while /visit's published-schedule fallback said wed-sat
// is "Closed" (Brenda's #475 update). That was an ACTIVE production
// contradiction: a customer reading /contact would arrive Saturday to
// a closed showroom.
//
// Single source of truth is the SiteContent collection. Two keys:
//   visit.hours.sun-tue  → "10 am – 5 pm" (current published default)
//   visit.hours.wed-sat  → "Closed"        (current published default)
//
// Both keys are owner-editable via the Wix CMS. Either may flip to an
// hours string OR to the literal "Closed" at any time. The composer
// in getShowroomScheduleLine handles both shapes.

import { getSiteContent } from "@/lib/cms/site-content";

/**
 * Closed-marker the SiteContent rows are expected to use when a day-range
 * is closed. Exported so callers building tabular layouts can recognise
 * the marker without string-comparing literals.
 */
export const SHOWROOM_CLOSED_MARKER = "Closed";

const SUN_TUE_KEY = "visit.hours.sun-tue";
const WED_SAT_KEY = "visit.hours.wed-sat";
const SUN_TUE_FALLBACK = "10 am – 5 pm";
const WED_SAT_FALLBACK = "Closed";

/**
 * Fetch the Sunday–Tuesday hours string. Returns the SiteContent value
 * when present, falls back to "10 am – 5 pm" on outage or missing row.
 */
export async function getShowroomHoursSunTue(): Promise<string> {
  return getSiteContent(SUN_TUE_KEY, SUN_TUE_FALLBACK);
}

/**
 * Fetch the Wednesday–Saturday hours string. Returns the SiteContent
 * value when present, falls back to "Closed" (Brenda's #475 published
 * schedule) on outage or missing row.
 */
export async function getShowroomHoursWedSat(): Promise<string> {
  return getSiteContent(WED_SAT_KEY, WED_SAT_FALLBACK);
}

/**
 * Compose the inline showroom-hours sentence consumed by /contact
 * "Schedule a showroom visit" sub-copy:
 *
 *   Open Sunday through Tuesday, 10 am – 5 pm. Closed Wednesday through Saturday.
 *
 * Each half is independently SiteContent-driven; the "Closed" marker
 * vs an hours string is the only branch. Caller composes the trailing
 * sentence ("Request a slot and we'll confirm…") if needed.
 */
export async function getShowroomScheduleLine(): Promise<string> {
  const [sunTue, wedSat] = await Promise.all([
    getShowroomHoursSunTue(),
    getShowroomHoursWedSat(),
  ]);
  return [
    formatHalf("Sunday through Tuesday", sunTue),
    formatHalf("Wednesday through Saturday", wedSat),
  ].join(" ");
}

function formatHalf(daysLabel: string, hoursText: string): string {
  // cf-7pk0 melania CR fold: case-insensitive + whitespace-tolerant
  // comparison. Wix CMS editors (Brenda et al) may type "closed",
  // "CLOSED", or " Closed " — exact-string match leaks the raw editor
  // input through the formatter ("Open Wed-Sat, closed.") instead of
  // taking the "Closed Wed-Sat." branch.
  if (hoursText.trim().toLowerCase() === SHOWROOM_CLOSED_MARKER.toLowerCase()) {
    return `Closed ${daysLabel}.`;
  }
  return `Open ${daysLabel}, ${hoursText}.`;
}

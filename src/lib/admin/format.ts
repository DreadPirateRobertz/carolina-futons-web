// cfw-3w8: shared time-formatting helpers for owner-mode surfaces
// (/admin/audit, /admin home recent activity, EditableText ↶ history).
// Inlined copies were drifting independently in three files — extract to
// one module so a future tweak (locale, date-library swap, "Today" /
// "Yesterday" callouts) lands in one place.
//
// No date library — both helpers are <20 LoC and avoid pulling in
// dayjs/luxon for the only places these are used.

/**
 * Format an ISO-8601 timestamp into "YYYY-MM-DD HH:MMZ" — sortable,
 * unambiguous, UTC. Used by /admin/audit table rows and the /admin home
 * recent-activity card so both surfaces match.
 *
 * Returns the input string unchanged if it isn't parseable, so a
 * malformed legacy row never blows up the render.
 */
export function formatAuditTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + "Z";
}

/**
 * Format an ISO-8601 timestamp into a relative-time string ("just now",
 * "5m ago", "3h ago", "2d ago"). Used by the EditableText ↶ history
 * panel where compactness matters more than precision.
 *
 * Returns the input unchanged on parse failure (same defensive shape as
 * formatAuditTimestamp).
 */
export function formatRelativeTime(
  iso: string,
  now: () => number = () => Date.now(),
): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const diffSec = (now() - then) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 60 * 60) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 60 * 60 * 24) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / (3600 * 24))}d ago`;
}

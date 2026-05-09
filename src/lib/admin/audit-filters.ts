import type { AuditAction, AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: shared filter logic between /admin/audit (cfw-ild) and
// GET /api/admin/audit/export. Extracted from the page so both surfaces
// apply identical narrowing — a row that's hidden in the UI never
// accidentally lands in the CSV download, and vice versa.
//
// cfw-9j9: extended with from/to date-range filters. Both are parsed as
// "YYYY-MM-DD" UTC dates. Inclusive on both ends — from=2026-05-09 and
// to=2026-05-09 matches every row whose ts falls anywhere on May 9
// (00:00:00.000Z … 23:59:59.999Z). Empty / invalid date strings fall
// through (no filter), so a partially-typed input never produces a
// confusing "everything disappeared" UX.

const ACTION_VALUES: ReadonlyArray<AuditAction> = ["edit", "upload", "swap"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AuditFilters = {
  action: AuditAction | null;
  actor: string;
  /** UTC timestamp of the start of `from`'s day (00:00:00.000Z), or null. */
  fromMs: number | null;
  /** UTC timestamp of the end of `to`'s day (23:59:59.999Z), or null. */
  toMs: number | null;
  /** Original YYYY-MM-DD strings retained for round-tripping into form defaults. */
  fromRaw: string;
  toRaw: string;
};

function parseDateStart(raw: string | undefined): { ms: number | null; raw: string } {
  if (typeof raw !== "string") return { ms: null, raw: "" };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ms: null, raw: "" };
  // Reject anything that isn't a calendar-date — Date.parse is way too
  // forgiving (it accepts "abc" as NaN, but also "Jan 1" → year 2001).
  if (!ISO_DATE_RE.test(trimmed)) return { ms: null, raw: "" };
  const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return { ms: null, raw: "" };
  return { ms, raw: trimmed };
}

function parseDateEnd(raw: string | undefined): { ms: number | null; raw: string } {
  if (typeof raw !== "string") return { ms: null, raw: "" };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ms: null, raw: "" };
  if (!ISO_DATE_RE.test(trimmed)) return { ms: null, raw: "" };
  const ms = Date.parse(`${trimmed}T23:59:59.999Z`);
  if (!Number.isFinite(ms)) return { ms: null, raw: "" };
  return { ms, raw: trimmed };
}

export function parseAuditFilters(raw: {
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
}): AuditFilters {
  const action =
    typeof raw.action === "string" &&
    (ACTION_VALUES as ReadonlyArray<string>).includes(raw.action)
      ? (raw.action as AuditAction)
      : null;
  const actor = typeof raw.actor === "string" ? raw.actor.trim() : "";
  const from = parseDateStart(raw.from);
  const to = parseDateEnd(raw.to);
  return {
    action,
    actor,
    fromMs: from.ms,
    toMs: to.ms,
    fromRaw: from.raw,
    toRaw: to.raw,
  };
}

export function applyAuditFilters(
  rows: AuditLogRow[],
  f: AuditFilters,
): AuditLogRow[] {
  const actorNeedle = f.actor.toLowerCase();
  return rows.filter((r) => {
    if (f.action && r.action !== f.action) return false;
    if (
      actorNeedle.length > 0 &&
      !r.actorEmail.toLowerCase().includes(actorNeedle)
    ) {
      return false;
    }
    if (f.fromMs !== null || f.toMs !== null) {
      const rowMs = Date.parse(r.ts);
      if (!Number.isFinite(rowMs)) return false;
      if (f.fromMs !== null && rowMs < f.fromMs) return false;
      if (f.toMs !== null && rowMs > f.toMs) return false;
    }
    return true;
  });
}

export function auditFiltersActive(f: AuditFilters): boolean {
  return (
    f.action !== null ||
    f.actor.length > 0 ||
    f.fromMs !== null ||
    f.toMs !== null
  );
}

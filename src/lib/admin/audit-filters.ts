import type { AuditAction, AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: shared filter logic between /admin/audit (cfw-ild) and the
// new GET /api/admin/audit/export CSV endpoint. Extracted from the page
// so both surfaces apply identical narrowing — a row that's hidden in
// the UI never accidentally lands in the CSV download, and vice versa.

const ACTION_VALUES: ReadonlyArray<AuditAction> = ["edit", "upload", "swap"];

export type AuditFilters = {
  action: AuditAction | null;
  actor: string;
};

export function parseAuditFilters(raw: {
  action?: string;
  actor?: string;
}): AuditFilters {
  const action =
    typeof raw.action === "string" &&
    (ACTION_VALUES as ReadonlyArray<string>).includes(raw.action)
      ? (raw.action as AuditAction)
      : null;
  const actor = typeof raw.actor === "string" ? raw.actor.trim() : "";
  return { action, actor };
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
    return true;
  });
}

export function auditFiltersActive(f: AuditFilters): boolean {
  return f.action !== null || f.actor.length > 0;
}

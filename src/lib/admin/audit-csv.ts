import type { AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: RFC 4180-compliant CSV serializer for OwnerAuditLog rows.
// Header order matches the /admin/audit table column order so a CSV
// pasted into a spreadsheet reads the same as the on-screen view.
//
// Escape rules per RFC 4180 §2:
//   - Fields containing commas, double-quotes, or CRLF must be wrapped
//     in double-quotes.
//   - Embedded double-quotes must be doubled ("" inside the field).
//   - Records terminate with CRLF (\r\n) for maximum spreadsheet
//     compatibility — Excel on Windows is the strictest consumer and
//     LF-only triggers "single cell of garbage" import.

export const AUDIT_CSV_HEADER = [
  "When",
  "Who",
  "Action",
  "Target",
  "Before",
  "After",
] as const;

function escapeField(raw: unknown): string {
  // Normalize null/undefined/non-string into a string. Audit rows always
  // have string fields so this is mostly defensive.
  const s = raw === null || raw === undefined ? "" : String(raw);
  // Always wrap in quotes for consistency — sheet apps don't care, and
  // unconditional quoting eliminates the per-field comma/CRLF/quote
  // detection branch.
  return `"${s.replace(/"/g, '""')}"`;
}

function rowToCsv(row: AuditLogRow): string {
  return [
    row.ts,
    row.actorEmail,
    row.action,
    row.target,
    row.before ?? "",
    row.after ?? "",
  ]
    .map(escapeField)
    .join(",");
}

/**
 * Serialize rows to a CSV string with header row. Returns "" when
 * `rows` is empty (the route should still respond with the header so
 * downstream tooling sees a valid empty CSV — call `auditRowsToCsv([])`
 * to get the header alone).
 */
export function auditRowsToCsv(rows: ReadonlyArray<AuditLogRow>): string {
  const header = AUDIT_CSV_HEADER.map(escapeField).join(",");
  if (rows.length === 0) return `${header}\r\n`;
  const body = rows.map(rowToCsv).join("\r\n");
  return `${header}\r\n${body}\r\n`;
}

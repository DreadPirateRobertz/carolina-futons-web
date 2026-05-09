import { NextResponse, type NextRequest } from "next/server";

import { getOwnerSession } from "@/lib/auth/owner";
import { readOwnerAuditLog } from "@/lib/admin/audit-log";
import {
  applyAuditFilters,
  parseAuditFilters,
} from "@/lib/admin/audit-filters";
import { auditRowsToCsv } from "@/lib/admin/audit-csv";

// cfw-daa: CSV export for /admin/audit. Reuses the same readOwnerAuditLog
// + parseAuditFilters/applyAuditFilters as the page (cfw-xlv + cfw-ild)
// so a CSV download contains exactly the rows the page would render.
//
//   GET /api/admin/audit/export?action=edit&actor=brenda
//   → 200 text/csv (Content-Disposition: attachment; filename=audit-...)
//   → 401 owner gate
//   → 502 Wix outage
//
// We don't stream — readOwnerAuditLog is capped at 200 rows, so a
// straight string serialise + send is fine. If the cap ever grows, swap
// to a TransformStream that pipes per-row CSV through the response.

export const dynamic = "force-dynamic";

const ROW_LIMIT = 200;

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function filenameStamp(): string {
  // YYYYMMDD-HHMMZ — sortable, no colons (Windows file-name hostile).
  return new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:]/g, "")
    .replace("T", "-");
}

export async function GET(req: NextRequest) {
  const owner = await getOwnerSession();
  if (!owner) {
    return jsonError("Owner sign-in required.", 401);
  }

  const url = new URL(req.url);
  const filters = parseAuditFilters({
    action: url.searchParams.get("action") ?? undefined,
    actor: url.searchParams.get("actor") ?? undefined,
  });

  const result = await readOwnerAuditLog(ROW_LIMIT);
  if (!result.ok) {
    return jsonError("Couldn't load the audit log. Try again.", 502);
  }

  const filtered = applyAuditFilters(result.rows, filters);
  const csv = auditRowsToCsv(filtered);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="owner-audit-${filenameStamp()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

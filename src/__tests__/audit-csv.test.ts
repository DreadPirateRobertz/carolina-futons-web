import { describe, it, expect } from "vitest";

import { auditRowsToCsv, AUDIT_CSV_HEADER } from "@/lib/admin/audit-csv";
import type { AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: RFC 4180 serialization. Tests pin the contract a downstream
// spreadsheet importer cares about: header presence, CRLF terminators,
// double-quote doubling, comma/newline-safe quoting.

const SAMPLE: AuditLogRow = {
  _id: "r1",
  actorEmail: "brenda@x.com",
  action: "edit",
  target: "footer.tagline",
  before: "old",
  after: "new",
  ts: "2026-05-09T15:00:00.000Z",
};

describe("auditRowsToCsv — header", () => {
  it("emits the canonical header order matching the /admin/audit table columns", () => {
    expect([...AUDIT_CSV_HEADER]).toEqual([
      "When",
      "Who",
      "Action",
      "Target",
      "Before",
      "After",
    ]);
  });

  it("returns header-only output for an empty rows array", () => {
    const csv = auditRowsToCsv([]);
    expect(csv).toBe('"When","Who","Action","Target","Before","After"\r\n');
  });
});

describe("auditRowsToCsv — single row", () => {
  it("serialises a single row in column order with CRLF terminator", () => {
    const csv = auditRowsToCsv([SAMPLE]);
    expect(csv).toBe(
      '"When","Who","Action","Target","Before","After"\r\n' +
        '"2026-05-09T15:00:00.000Z","brenda@x.com","edit","footer.tagline","old","new"\r\n',
    );
  });

  it("doubles embedded double-quotes (RFC 4180 §2)", () => {
    const csv = auditRowsToCsv([
      { ...SAMPLE, after: 'He said "hi"' },
    ]);
    // The after column should contain "He said ""hi""".
    expect(csv).toContain('"He said ""hi"""');
  });

  it("preserves embedded commas without escaping (already wrapped in quotes)", () => {
    const csv = auditRowsToCsv([
      { ...SAMPLE, before: "old, with, commas" },
    ]);
    expect(csv).toContain('"old, with, commas"');
  });

  it("preserves embedded newlines as literal CR/LF inside the quoted field", () => {
    const csv = auditRowsToCsv([
      { ...SAMPLE, after: "line1\nline2" },
    ]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders empty before/after as empty quoted fields", () => {
    const csv = auditRowsToCsv([{ ...SAMPLE, before: "", after: "" }]);
    // Last three columns: target, before (""), after ("").
    expect(csv).toMatch(/"footer\.tagline","",""\r\n$/);
  });

  it("coerces null/undefined optional fields to empty strings", () => {
    const csv = auditRowsToCsv([
      { ...SAMPLE, before: undefined as unknown as string },
    ]);
    // The before column should be an empty quoted field.
    expect(csv).toContain('"footer.tagline","",');
  });
});

describe("auditRowsToCsv — multiple rows", () => {
  it("joins rows with CRLF and ends with a trailing CRLF", () => {
    const csv = auditRowsToCsv([
      { ...SAMPLE, ts: "T1" },
      { ...SAMPLE, ts: "T2" },
      { ...SAMPLE, ts: "T3" },
    ]);
    const lines = csv.split("\r\n");
    // header + 3 data rows + trailing empty (from final \r\n) = 5
    expect(lines.length).toBe(5);
    expect(lines[lines.length - 1]).toBe("");
    expect(lines[1]).toContain('"T1"');
    expect(lines[3]).toContain('"T3"');
  });
});

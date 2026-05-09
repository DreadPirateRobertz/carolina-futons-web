import { describe, it, expect } from "vitest";

import {
  applyAuditFilters,
  parseAuditFilters,
  auditFiltersActive,
} from "@/lib/admin/audit-filters";
import type { AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: shared filter logic. Tests pin the same matrix as the
// AdminAuditPage cfw-ild integration tests but at the unit level so the
// /api/admin/audit/export route can rely on the same behaviour without
// rendering the page.

const ROWS: AuditLogRow[] = [
  {
    _id: "r1",
    actorEmail: "brenda@cfutons.com",
    action: "edit",
    target: "footer.tagline",
    before: "x",
    after: "y",
    ts: "T1",
  },
  {
    _id: "r2",
    actorEmail: "chris@cfutons.com",
    action: "upload",
    target: "hero.image",
    before: "",
    after: "https://wix",
    ts: "T2",
  },
  {
    _id: "r3",
    actorEmail: "brenda@cfutons.com",
    action: "swap",
    target: "products/kingston/main",
    before: "old.jpg",
    after: "new.jpg",
    ts: "T3",
  },
];

describe("parseAuditFilters", () => {
  it("returns null/empty for missing input", () => {
    expect(parseAuditFilters({})).toEqual({ action: null, actor: "" });
    expect(parseAuditFilters({ action: undefined, actor: undefined })).toEqual({
      action: null,
      actor: "",
    });
  });

  it("trims whitespace from actor", () => {
    expect(parseAuditFilters({ actor: "  brenda  " })).toEqual({
      action: null,
      actor: "brenda",
    });
  });

  it("accepts each valid action enum value", () => {
    for (const a of ["edit", "upload", "swap"] as const) {
      expect(parseAuditFilters({ action: a }).action).toBe(a);
    }
  });

  it("ignores unknown action values (returns null)", () => {
    expect(parseAuditFilters({ action: "delete" }).action).toBeNull();
    expect(parseAuditFilters({ action: "" }).action).toBeNull();
  });
});

describe("applyAuditFilters", () => {
  it("returns all rows when no filters", () => {
    expect(applyAuditFilters(ROWS, { action: null, actor: "" })).toEqual(ROWS);
  });

  it("narrows by action enum", () => {
    expect(
      applyAuditFilters(ROWS, { action: "edit", actor: "" }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("narrows by actor (case-insensitive substring)", () => {
    expect(
      applyAuditFilters(ROWS, { action: null, actor: "BRENDA" }).map((r) => r._id),
    ).toEqual(["r1", "r3"]);
  });

  it("composes action + actor (AND)", () => {
    expect(
      applyAuditFilters(ROWS, { action: "swap", actor: "brenda" }).map(
        (r) => r._id,
      ),
    ).toEqual(["r3"]);
  });

  it("returns empty when filters cull everything", () => {
    expect(
      applyAuditFilters(ROWS, { action: "edit", actor: "no-match" }),
    ).toEqual([]);
  });
});

describe("auditFiltersActive", () => {
  it("false on default filters", () => {
    expect(auditFiltersActive({ action: null, actor: "" })).toBe(false);
  });

  it("true when action is set", () => {
    expect(auditFiltersActive({ action: "edit", actor: "" })).toBe(true);
  });

  it("true when actor is set", () => {
    expect(auditFiltersActive({ action: null, actor: "brenda" })).toBe(true);
  });
});

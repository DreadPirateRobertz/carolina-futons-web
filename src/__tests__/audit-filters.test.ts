import { describe, it, expect } from "vitest";

import {
  applyAuditFilters,
  parseAuditFilters,
  auditFiltersActive,
  type AuditFilters,
} from "@/lib/admin/audit-filters";
import type { AuditLogRow } from "@/lib/admin/audit-log";

// cfw-daa: shared filter logic. Tests pin the same matrix as the
// AdminAuditPage cfw-ild integration tests but at the unit level so the
// /api/admin/audit/export route can rely on the same behaviour without
// rendering the page.
//
// cfw-9j9: extended with from/to date-range coverage.

const ROWS: AuditLogRow[] = [
  {
    _id: "r1",
    actorEmail: "brenda@cfutons.com",
    action: "edit",
    target: "footer.tagline",
    before: "x",
    after: "y",
    ts: "2026-05-09T15:00:00.000Z",
  },
  {
    _id: "r2",
    actorEmail: "chris@cfutons.com",
    action: "upload",
    target: "hero.image",
    before: "",
    after: "https://wix",
    ts: "2026-05-08T14:00:00.000Z",
  },
  {
    _id: "r3",
    actorEmail: "brenda@cfutons.com",
    action: "swap",
    target: "products/kingston/main",
    before: "old.jpg",
    after: "new.jpg",
    ts: "2026-05-07T13:00:00.000Z",
  },
];

const NO_FILTERS: AuditFilters = {
  action: null,
  actor: "",
  fromMs: null,
  toMs: null,
  fromRaw: "",
  toRaw: "",
  q: "",
};

describe("parseAuditFilters", () => {
  it("returns no-filter shape for missing input", () => {
    expect(parseAuditFilters({})).toEqual(NO_FILTERS);
    expect(
      parseAuditFilters({
        action: undefined,
        actor: undefined,
        from: undefined,
        to: undefined,
      }),
    ).toEqual(NO_FILTERS);
  });

  it("trims whitespace from actor", () => {
    expect(parseAuditFilters({ actor: "  brenda  " })).toEqual({
      ...NO_FILTERS,
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

  it("parses ?from=YYYY-MM-DD into the start-of-UTC-day timestamp", () => {
    const f = parseAuditFilters({ from: "2026-05-09" });
    expect(f.fromRaw).toBe("2026-05-09");
    expect(f.fromMs).toBe(Date.parse("2026-05-09T00:00:00.000Z"));
  });

  it("parses ?to=YYYY-MM-DD into the end-of-UTC-day timestamp", () => {
    const f = parseAuditFilters({ to: "2026-05-09" });
    expect(f.toRaw).toBe("2026-05-09");
    expect(f.toMs).toBe(Date.parse("2026-05-09T23:59:59.999Z"));
  });

  it("ignores malformed date strings (returns null + empty raw)", () => {
    for (const bad of ["abc", "2026/05/09", "2026-5-9", "Jan 1", "  "]) {
      const f = parseAuditFilters({ from: bad, to: bad });
      expect(f.fromMs).toBeNull();
      expect(f.toMs).toBeNull();
      expect(f.fromRaw).toBe("");
      expect(f.toRaw).toBe("");
    }
  });
});

describe("applyAuditFilters", () => {
  it("returns all rows when no filters", () => {
    expect(applyAuditFilters(ROWS, NO_FILTERS)).toEqual(ROWS);
  });

  it("narrows by action enum", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, action: "edit" }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("narrows by actor (case-insensitive substring)", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, actor: "BRENDA" }).map((r) => r._id),
    ).toEqual(["r1", "r3"]);
  });

  it("composes action + actor (AND)", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        action: "swap",
        actor: "brenda",
      }).map((r) => r._id),
    ).toEqual(["r3"]);
  });

  it("returns empty when filters cull everything", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        action: "edit",
        actor: "no-match",
      }),
    ).toEqual([]);
  });

  it("?from filter excludes rows before the start-of-day timestamp", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        fromMs: Date.parse("2026-05-09T00:00:00.000Z"),
      }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("?to filter excludes rows after the end-of-day timestamp", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        toMs: Date.parse("2026-05-08T23:59:59.999Z"),
      }).map((r) => r._id),
    ).toEqual(["r2", "r3"]);
  });

  it("?from + ?to is inclusive on both ends (single-day match)", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        fromMs: Date.parse("2026-05-09T00:00:00.000Z"),
        toMs: Date.parse("2026-05-09T23:59:59.999Z"),
      }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("composes date range with action/actor", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        action: "swap",
        fromMs: Date.parse("2026-05-07T00:00:00.000Z"),
        toMs: Date.parse("2026-05-07T23:59:59.999Z"),
      }).map((r) => r._id),
    ).toEqual(["r3"]);
  });

  it("rejects rows with non-parseable ts when a date filter is set", () => {
    const broken = [{ ...ROWS[0]!, ts: "not-a-date" }];
    expect(
      applyAuditFilters(broken, {
        ...NO_FILTERS,
        fromMs: Date.parse("2026-05-09T00:00:00.000Z"),
      }),
    ).toEqual([]);
  });
});

describe("auditFiltersActive", () => {
  it("false on default filters", () => {
    expect(auditFiltersActive(NO_FILTERS)).toBe(false);
  });

  it("true when action is set", () => {
    expect(auditFiltersActive({ ...NO_FILTERS, action: "edit" })).toBe(true);
  });

  it("true when actor is set", () => {
    expect(auditFiltersActive({ ...NO_FILTERS, actor: "brenda" })).toBe(true);
  });

  it("true when fromMs is set", () => {
    expect(auditFiltersActive({ ...NO_FILTERS, fromMs: 0 })).toBe(true);
  });

  it("true when toMs is set", () => {
    expect(auditFiltersActive({ ...NO_FILTERS, toMs: 0 })).toBe(true);
  });

  it("true when q is set", () => {
    expect(auditFiltersActive({ ...NO_FILTERS, q: "sale" })).toBe(true);
  });
});

describe("parseAuditFilters — cfw-3zk free-text q", () => {
  it("trims whitespace", () => {
    expect(parseAuditFilters({ q: "  sale  " }).q).toBe("sale");
  });

  it("defaults to empty string when missing or non-string", () => {
    expect(parseAuditFilters({}).q).toBe("");
    expect(parseAuditFilters({ q: undefined }).q).toBe("");
  });
});

describe("applyAuditFilters — cfw-3zk free-text q", () => {
  it("matches against row.target (case-insensitive)", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, q: "FOOTER" }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("matches against row.after", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, q: "new.jpg" }).map((r) => r._id),
    ).toEqual(["r3"]);
  });

  it("matches against row.before", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, q: "old.jpg" }).map((r) => r._id),
    ).toEqual(["r3"]);
  });

  it("returns empty when nothing matches", () => {
    expect(
      applyAuditFilters(ROWS, { ...NO_FILTERS, q: "no-such-string" }),
    ).toEqual([]);
  });

  it("composes q with action + actor", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        action: "edit",
        actor: "brenda",
        q: "footer",
      }).map((r) => r._id),
    ).toEqual(["r1"]);
  });

  it("composes q with date range", () => {
    expect(
      applyAuditFilters(ROWS, {
        ...NO_FILTERS,
        q: "kingston",
        fromMs: Date.parse("2026-05-07T00:00:00.000Z"),
        toMs: Date.parse("2026-05-07T23:59:59.999Z"),
      }).map((r) => r._id),
    ).toEqual(["r3"]);
  });

  it("treats whitespace-only q as no filter (after trim)", () => {
    expect(applyAuditFilters(ROWS, { ...NO_FILTERS, q: "   " })).toEqual(ROWS);
  });
});

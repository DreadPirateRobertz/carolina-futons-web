import { describe, it, expect, beforeEach, vi } from "vitest";

// cfw-daa: GET /api/admin/audit/export. Tests pin the contract Brenda's
// browser cares about: auth gate, CSV content type, attachment header,
// filter application, header-only output on empty, error path.

vi.mock("server-only", () => ({}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: () => mockGetOwnerSession(),
}));

const mockReadOwnerAuditLog = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({
  readOwnerAuditLog: (...args: unknown[]) => mockReadOwnerAuditLog(...args),
}));

const ROWS = [
  {
    _id: "r1",
    actorEmail: "brenda@x.com",
    action: "edit",
    target: "footer.tagline",
    before: "old",
    after: "new",
    ts: "2026-05-09T15:00:00.000Z",
  },
  {
    _id: "r2",
    actorEmail: "chris@x.com",
    action: "upload",
    target: "hero.image",
    before: "",
    after: "https://wix",
    ts: "2026-05-09T14:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOwnerSession.mockResolvedValue({
    email: "brenda@x.com",
    memberId: "m",
    accessToken: "t",
    tokens: {},
  });
  mockReadOwnerAuditLog.mockResolvedValue({ ok: true, rows: ROWS });
});

function makeReq(query = "") {
  return new Request(`https://test.local/api/admin/audit/export${query}`, {
    method: "GET",
  });
}

describe("GET /api/admin/audit/export — auth", () => {
  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(401);
    expect(mockReadOwnerAuditLog).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/audit/export — happy path", () => {
  it("returns 200 + text/csv content-type", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
  });

  it("attaches a Content-Disposition with a stamped filename", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    const cd = res.headers.get("content-disposition");
    expect(cd).toMatch(
      /^attachment; filename="owner-audit-\d{8}-\d{4}\.csv"$/,
    );
  });

  it("Cache-Control: no-store (don't cache audit downloads)", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("body contains the header row + every audit row in order", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    const body = await res.text();
    const lines = body.split("\r\n").filter(Boolean);
    expect(lines[0]).toBe('"When","Who","Action","Target","Before","After"');
    expect(lines[1]).toContain('"footer.tagline"');
    expect(lines[2]).toContain('"hero.image"');
  });

  it("requests up to 200 rows from the helper (matches the page cap)", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    await GET(makeReq() as never);
    expect(mockReadOwnerAuditLog).toHaveBeenCalledWith(200);
  });
});

describe("GET /api/admin/audit/export — filtering", () => {
  it("?action=edit narrows the CSV body", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq("?action=edit") as never);
    const body = await res.text();
    expect(body).toContain('"footer.tagline"');
    expect(body).not.toContain('"hero.image"');
  });

  it("?actor= narrows by case-insensitive substring", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq("?actor=CHRIS") as never);
    const body = await res.text();
    expect(body).toContain('"hero.image"');
    expect(body).not.toContain('"footer.tagline"');
  });

  it("composes action + actor (AND)", async () => {
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq("?action=upload&actor=brenda") as never);
    const body = await res.text();
    // No row matches both → header-only output.
    const lines = body.split("\r\n").filter(Boolean);
    expect(lines.length).toBe(1);
  });

  it("returns header-only output when the underlying log is empty", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('"When","Who","Action","Target","Before","After"\r\n');
  });
});

describe("GET /api/admin/audit/export — Wix outage", () => {
  it("502 when readOwnerAuditLog returns ok:false", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "down",
    });
    const { GET } = await import("@/app/api/admin/audit/export/route");
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

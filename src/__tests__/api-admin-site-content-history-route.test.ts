import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-cns: GET /api/admin/site-content/history?key= — reads the
// SiteContentHistory collection for the upcoming ↶ undo affordance in
// EditableText. Tests pin: auth gate, key validation (delegated to the
// shared validateOwnerEditKey), limit parsing (default + cap + bad input),
// happy path, and Wix outage surfaces as 502.

vi.mock("server-only", () => ({}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: () => mockGetOwnerSession(),
}));

const mockReadSiteContentHistory = vi.fn();
vi.mock("@/lib/cms/site-content-history", () => ({
  readSiteContentHistory: (...args: unknown[]) =>
    mockReadSiteContentHistory(...args),
}));

const tokens: Tokens = {
  accessToken: { value: "a", expiresAt: 9_999_999_999 },
  refreshToken: { value: "r", role: "member" as Tokens["refreshToken"]["role"] },
};

const OWNER_SESSION = {
  email: "brenda@x.com",
  memberId: "member-owner",
  accessToken: "a",
  tokens,
};

const SAMPLE_ROWS = [
  {
    _id: "h-3",
    _createdDate: "2026-05-09T15:00:00Z",
    key: "footer.tagline",
    before: "v2",
    after: "v3",
    actorEmail: "brenda@x.com",
  },
  {
    _id: "h-2",
    _createdDate: "2026-05-09T14:00:00Z",
    key: "footer.tagline",
    before: "v1",
    after: "v2",
    actorEmail: "brenda@x.com",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOwnerSession.mockResolvedValue(OWNER_SESSION);
  mockReadSiteContentHistory.mockResolvedValue({ ok: true, rows: SAMPLE_ROWS });
});

function makeReq(query: string) {
  return new Request(`https://test.local/api/admin/site-content/history${query}`, {
    method: "GET",
  });
}

describe("GET /api/admin/site-content/history — auth", () => {
  it("returns 401 when no owner session", async () => {
    mockGetOwnerSession.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("?key=footer.tagline") as never);
    expect(res.status).toBe(401);
    expect(mockReadSiteContentHistory).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/site-content/history — key validation", () => {
  it("400 when key is missing", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("") as never);
    expect(res.status).toBe(400);
    expect(mockReadSiteContentHistory).not.toHaveBeenCalled();
  });

  it("400 when key violates the SiteContent naming convention", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    // Single-segment key — same validator as POST rejects it.
    const res = await GET(makeReq("?key=footer") as never);
    expect(res.status).toBe(400);
    expect(mockReadSiteContentHistory).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/site-content/history — limit parsing", () => {
  it("defaults limit to 5 when omitted", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    await GET(makeReq("?key=footer.tagline") as never);
    expect(mockReadSiteContentHistory).toHaveBeenCalledWith("footer.tagline", 5);
  });

  it("honours an explicit positive integer", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    await GET(makeReq("?key=footer.tagline&limit=20") as never);
    expect(mockReadSiteContentHistory).toHaveBeenCalledWith(
      "footer.tagline",
      20,
    );
  });

  it("caps limit at 50 (no unbounded reads)", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    await GET(makeReq("?key=footer.tagline&limit=10000") as never);
    expect(mockReadSiteContentHistory).toHaveBeenCalledWith(
      "footer.tagline",
      50,
    );
  });

  it("400 on non-numeric limit", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("?key=footer.tagline&limit=abc") as never);
    expect(res.status).toBe(400);
    expect(mockReadSiteContentHistory).not.toHaveBeenCalled();
  });

  it("400 on zero / negative / fractional limit", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    for (const bad of ["0", "-5", "2.5"]) {
      mockReadSiteContentHistory.mockClear();
      const res = await GET(
        makeReq(`?key=footer.tagline&limit=${bad}`) as never,
      );
      expect(res.status).toBe(400);
      expect(mockReadSiteContentHistory).not.toHaveBeenCalled();
    }
  });
});

describe("GET /api/admin/site-content/history — happy path", () => {
  it("200 + rows in response", async () => {
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("?key=footer.tagline") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; rows: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.rows).toEqual(SAMPLE_ROWS);
  });

  it("returns an empty array when the key has no history yet", async () => {
    mockReadSiteContentHistory.mockResolvedValueOnce({ ok: true, rows: [] });
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("?key=footer.tagline") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[] };
    expect(body.rows).toEqual([]);
  });
});

describe("GET /api/admin/site-content/history — Wix outage", () => {
  it("502 when the helper returns ok:false", async () => {
    mockReadSiteContentHistory.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
    const { GET } = await import("@/app/api/admin/site-content/history/route");
    const res = await GET(makeReq("?key=footer.tagline") as never);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/history/i);
  });
});

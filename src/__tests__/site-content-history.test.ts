import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-6qd.10: server-side history persistence for owner SiteContent edits.
// Pins the insert/query plumbing against a mocked @/lib/wix-client and
// verifies fail-soft behaviour (errors return { ok: false }, never throw).

const insertMock = vi.fn();
const findMock = vi.fn();
const limitMock = vi.fn(() => ({ find: findMock }));
const descendingMock = vi.fn(() => ({ limit: limitMock }));
const eqMock = vi.fn(() => ({ descending: descendingMock }));
const queryMock = vi.fn(() => ({ eq: eqMock }));

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({ items: { query: queryMock } }),
  getWixClientWithTokens: () => ({
    items: { insert: insertMock, query: queryMock },
  }),
}));

const tokens: Tokens = {
  accessToken: { value: "a", expiresAt: 0 },
  refreshToken: {
    value: "r",
    role: "member" as Tokens["refreshToken"]["role"],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("writeSiteContentHistory", () => {
  it("inserts a row to SiteContentHistory with the full edit shape", async () => {
    insertMock.mockResolvedValue({ _id: "row-h-1" });
    const { writeSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await writeSiteContentHistory({
      tokens,
      key: "footer.tagline",
      before: "Old line",
      after: "New line",
      actorEmail: "brenda@carolinafutons.com",
    });

    expect(insertMock).toHaveBeenCalledWith("SiteContentHistory", {
      key: "footer.tagline",
      before: "Old line",
      after: "New line",
      actorEmail: "brenda@carolinafutons.com",
    });
    expect(result).toEqual({ ok: true, id: "row-h-1" });
  });

  it("returns ok=true with empty id when Wix omits _id (defensive)", async () => {
    insertMock.mockResolvedValue({});
    const { writeSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await writeSiteContentHistory({
      tokens,
      key: "k",
      before: "",
      after: "x",
      actorEmail: "e@x.com",
    });
    expect(result).toEqual({ ok: true, id: "" });
  });

  it("fails-soft on Wix throw — returns ok:false, never throws upward", async () => {
    insertMock.mockRejectedValue(
      Object.assign(new Error("collection not found"), { status: 404 }),
    );
    const { writeSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await writeSiteContentHistory({
      tokens,
      key: "k",
      before: "",
      after: "x",
      actorEmail: "e@x.com",
    });
    expect(result).toEqual({ ok: false, reason: "wix_error", status: 404 });
  });

  it("extracts status from response.status when error doesn't carry direct status", async () => {
    insertMock.mockRejectedValue({ response: { status: 502 } });
    const { writeSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await writeSiteContentHistory({
      tokens,
      key: "k",
      before: "",
      after: "x",
      actorEmail: "e@x.com",
    });
    expect(result).toEqual({ ok: false, reason: "wix_error", status: 502 });
  });
});

describe("readSiteContentHistory", () => {
  it("queries by key, sorts descending by _createdDate, applies default limit 5", async () => {
    findMock.mockResolvedValue({
      items: [
        { _id: "h2", _createdDate: "2026-05-09T12:00:00Z", key: "footer.tagline", before: "v1", after: "v2", actorEmail: "e" },
        { _id: "h1", _createdDate: "2026-05-09T11:00:00Z", key: "footer.tagline", before: "v0", after: "v1", actorEmail: "e" },
      ],
    });
    const { readSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await readSiteContentHistory("footer.tagline");

    expect(queryMock).toHaveBeenCalledWith("SiteContentHistory");
    expect(eqMock).toHaveBeenCalledWith("key", "footer.tagline");
    expect(descendingMock).toHaveBeenCalledWith("_createdDate");
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows).toHaveLength(2);
  });

  it("respects an explicit limit override", async () => {
    findMock.mockResolvedValue({ items: [] });
    const { readSiteContentHistory } = await import("@/lib/cms/site-content-history");
    await readSiteContentHistory("k", 12);
    expect(limitMock).toHaveBeenCalledWith(12);
  });

  it("fails-soft on Wix throw", async () => {
    findMock.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    const { readSiteContentHistory } = await import("@/lib/cms/site-content-history");
    const result = await readSiteContentHistory("k");
    expect(result).toEqual({ ok: false, reason: "wix_error", status: 500 });
  });
});

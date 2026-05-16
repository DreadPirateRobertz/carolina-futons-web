import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-6qd.11: recordOwnerEdit append-only audit writer. Tests pin: row
// shape (actorEmail, action, target, before, after, ts ISO string), the
// best-effort contract (Wix outage returns ok=false but never throws), and
// the timestamp injection point so we can pin the row without faking the
// global clock.

vi.mock("server-only", () => ({}));

const itemsSave = vi.fn();
const itemsFind = vi.fn();
const itemsLimit = vi.fn(() => ({ find: itemsFind }));
const itemsDescending = vi.fn(() => ({ limit: itemsLimit }));
const itemsQuery = vi.fn(() => ({ descending: itemsDescending }));
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ items: { save: itemsSave } }),
  getWixClient: () => ({ items: { query: itemsQuery } }),
}));

// cfw-logger migration: recordOwnerEdit's catch branch routes through
// logError so the Wix outage shows up in Sentry under source=audit-log.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import { recordOwnerEdit, readOwnerAuditLog } from "@/lib/admin/audit-log";

const tokens: Tokens = {
  accessToken: { value: "a", expiresAt: 1_780_000_000 },
  refreshToken: { value: "r", role: "member" as Tokens["refreshToken"]["role"] },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Re-wire the query chain after each clear so tests start with a working
  // descending().limit().find() pipeline.
  itemsLimit.mockReturnValue({ find: itemsFind });
  itemsDescending.mockReturnValue({ limit: itemsLimit });
  itemsQuery.mockReturnValue({ descending: itemsDescending });
  itemsFind.mockResolvedValue({ items: [] });
  itemsSave.mockResolvedValue({ _id: "audit-row-1" });
  logErrorMock.mockReset();
});

describe("recordOwnerEdit — happy path", () => {
  it("writes one row to the OwnerAuditLog collection", async () => {
    await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "edit",
        target: "footer.tagline",
        before: "old",
        after: "new",
      },
      tokens,
      () => "2026-05-09T15:00:00.000Z",
    );

    expect(itemsSave).toHaveBeenCalledTimes(1);
    expect(itemsSave).toHaveBeenCalledWith("OwnerAuditLog", {
      actorEmail: "brenda@x.com",
      action: "edit",
      target: "footer.tagline",
      before: "old",
      after: "new",
      ts: "2026-05-09T15:00:00.000Z",
    });
  });

  it("returns ok=true on success", async () => {
    const result = await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "edit",
        target: "k",
        before: "",
        after: "v",
      },
      tokens,
    );
    expect(result.ok).toBe(true);
  });

  it("preserves the action enum (edit/upload/swap)", async () => {
    await recordOwnerEdit(
      {
        actorEmail: "x@x.com",
        action: "upload",
        target: "hero.image",
        before: "",
        after: "https://static.wixstatic.com/media/abc",
      },
      tokens,
      () => "T",
    );
    expect(itemsSave.mock.calls[0]![1]).toMatchObject({ action: "upload" });

    await recordOwnerEdit(
      {
        actorEmail: "x@x.com",
        action: "swap",
        target: "product-123",
        before: "old",
        after: "new",
      },
      tokens,
      () => "T",
    );
    expect(itemsSave.mock.calls[1]![1]).toMatchObject({ action: "swap" });
  });

  it("defaults the timestamp to a real ISO string when no `now` override", async () => {
    await recordOwnerEdit(
      { actorEmail: "x@x.com", action: "edit", target: "k", before: "", after: "v" },
      tokens,
    );
    const ts = (itemsSave.mock.calls[0]![1] as { ts: unknown }).ts as string;
    expect(typeof ts).toBe("string");
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Round-trippable through Date.
    expect(Number.isFinite(Date.parse(ts))).toBe(true);
  });
});

describe("recordOwnerEdit — best-effort contract", () => {
  it("returns ok=false on Wix error and does NOT throw", async () => {
    itemsSave.mockRejectedValueOnce(new Error("Wix down"));

    const result = await recordOwnerEdit(
      { actorEmail: "x@x.com", action: "edit", target: "k", before: "", after: "v" },
      tokens,
    );

    expect(result).toEqual({
      ok: false,
      reason: "wix_outage",
      error: "Wix down",
    });
    // Observability now goes through logError (cfw-logger migration);
    // see the dedicated logError describe block below for the contract.
    expect(logErrorMock).toHaveBeenCalledWith(
      "audit-log",
      expect.stringContaining("failed to record edit on k"),
      expect.anything(),
    );
  });

  it("handles non-Error throws (Wix SDK occasionally rejects with strings)", async () => {
    itemsSave.mockRejectedValueOnce("not even an Error");

    const result = await recordOwnerEdit(
      { actorEmail: "x@x.com", action: "edit", target: "k", before: "", after: "v" },
      tokens,
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe("not even an Error");
    }
  });
});

describe("readOwnerAuditLog — cfw-xlv", () => {
  const SAMPLE = [
    { _id: "r1", actorEmail: "a@x.com", action: "edit", target: "k", before: "", after: "v", ts: "T" },
  ];

  it("queries OwnerAuditLog newest-first with the default limit (50)", async () => {
    itemsFind.mockResolvedValueOnce({ items: SAMPLE });
    const result = await readOwnerAuditLog();
    expect(itemsQuery).toHaveBeenCalledWith("OwnerAuditLog");
    expect(itemsDescending).toHaveBeenCalledWith("_createdDate");
    expect(itemsLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual({ ok: true, rows: SAMPLE });
  });

  it("honours an explicit limit", async () => {
    itemsFind.mockResolvedValueOnce({ items: [] });
    await readOwnerAuditLog(20);
    expect(itemsLimit).toHaveBeenCalledWith(20);
  });

  it("caps limit at 200", async () => {
    itemsFind.mockResolvedValueOnce({ items: [] });
    await readOwnerAuditLog(10_000);
    expect(itemsLimit).toHaveBeenCalledWith(200);
  });

  it("clamps non-positive / fractional limits to a sane positive integer", async () => {
    itemsFind.mockResolvedValueOnce({ items: [] });
    await readOwnerAuditLog(0);
    expect(itemsLimit).toHaveBeenCalledWith(1);
    itemsLimit.mockClear();
    await readOwnerAuditLog(2.7);
    expect(itemsLimit).toHaveBeenCalledWith(2);
  });

  it("returns ok:false on Wix outage", async () => {
    itemsFind.mockRejectedValueOnce(new Error("Wix down"));
    const result = await readOwnerAuditLog();
    expect(result).toEqual({
      ok: false,
      reason: "wix_outage",
      error: "Wix down",
    });
  });

  it("does not throw to the caller on unexpected errors", async () => {
    itemsFind.mockRejectedValueOnce("string error");
    const result = await readOwnerAuditLog();
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.error).toBe("string error");
  });
});

// cfw-logger migration: recordOwnerEdit's catch branch routes through
// logError("audit-log", ...). Pin the contract so the audit-trail
// failures stay observable in Sentry with the right source tag.
describe("recordOwnerEdit — logError observability", () => {
  it("calls logError when the Wix save throws", async () => {
    itemsSave.mockRejectedValueOnce(new Error("Wix down"));
    await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "edit",
        target: "footer.tagline",
        before: "old",
        after: "new",
      },
      tokens,
    );
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='audit-log' + interpolates action+target into the message", async () => {
    itemsSave.mockRejectedValueOnce(new Error("Wix down"));
    await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "upload",
        target: "hero.image",
        before: "",
        after: "https://static.wixstatic.com/media/abc.jpg",
      },
      tokens,
    );
    expect(logErrorMock).toHaveBeenCalledWith(
      "audit-log",
      "failed to record upload on hero.image",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly when err is an Error (preserves stack)", async () => {
    const err = new Error("Wix down");
    itemsSave.mockRejectedValueOnce(err);
    await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "swap",
        target: "prod-1",
        before: "",
        after: "",
      },
      tokens,
    );
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
  });
});

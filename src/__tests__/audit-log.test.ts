import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-6qd.11: recordOwnerEdit append-only audit writer. Tests pin: row
// shape (actorEmail, action, target, before, after, ts ISO string), the
// best-effort contract (Wix outage returns ok=false but never throws), and
// the timestamp injection point so we can pin the row without faking the
// global clock.

vi.mock("server-only", () => ({}));

// cfw-e1pl: recordOwnerEdit's Wix-outage catch path now routes through
// logError → Sentry. Mock the @sentry/nextjs surface so the test runner
// doesn't ship real events AND the new logError-integration cases below
// can assert on the (scope, op, extra) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const itemsSave = vi.fn();
const itemsFind = vi.fn();
const itemsLimit = vi.fn(() => ({ find: itemsFind }));
const itemsDescending = vi.fn(() => ({ limit: itemsLimit }));
const itemsQuery = vi.fn(() => ({ descending: itemsDescending }));
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ items: { save: itemsSave } }),
  getWixClient: () => ({ items: { query: itemsQuery } }),
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
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await recordOwnerEdit(
      { actorEmail: "x@x.com", action: "edit", target: "k", before: "", after: "v" },
      tokens,
    );

    expect(result).toEqual({
      ok: false,
      reason: "wix_outage",
      error: "Wix down",
    });
    // cfw-e1pl: the log line moved from a single console.error string to
    // logError("[audit-log] ... failed to record entry", err, { action, target }).
    // logError still calls console.error under the hood with the "[scope]
    // message" prefix; the action/target context that USED to be in that
    // string now flows through Sentry `extra` instead. Assertion narrowed
    // to the new prefix shape.
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[audit-log] failed to record entry"),
      expect.anything(),
      expect.objectContaining({ action: "edit", target: "k" }),
    );
    consoleSpy.mockRestore();
  });

  it("handles non-Error throws (Wix SDK occasionally rejects with strings)", async () => {
    itemsSave.mockRejectedValueOnce("not even an Error");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await recordOwnerEdit(
      { actorEmail: "x@x.com", action: "edit", target: "k", before: "", after: "v" },
      tokens,
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe("not even an Error");
    }
    consoleSpy.mockRestore();
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

// cfw-e1pl: pin the logError integration on recordOwnerEdit's
// best-effort catch. Wix's items.save can fail (network blip,
// collection unprovisioned, permission denied) — the audit write
// must NOT throw to the caller (it's best-effort), but it MUST
// surface to Sentry so a silent audit-trail outage is visible to
// ops. Pre-migration, this lived in `console.error("[audit-log]
// failed to record ${action} on ${target}: ${message}")` — stdout
// only, no Sentry. The migration moves action+target into Sentry
// `extra` so dashboards can filter by either.
describe("recordOwnerEdit — logError integration on Wix outage", () => {
  it("captures with scope='audit-log' + op='failed to record entry' + extra={action, target}", async () => {
    const err = new Error("wix items.save 502");
    itemsSave.mockRejectedValueOnce(err);

    const result = await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "edit",
        target: "footer.tagline",
        before: "old",
        after: "new",
      },
      tokens,
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe("wix_outage");
      expect(result.error).toBe("wix items.save 502");
    }

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "audit-log",
      op: "failed to record entry",
    });
    expect((opts as { extra: { action: string; target: string } }).extra).toEqual({
      action: "edit",
      target: "footer.tagline",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });

  it("happy path (Wix save succeeds) does NOT call Sentry", async () => {
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

    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("preserves the per-action context in Sentry — 'upload' and 'swap' surface separately from 'edit'", async () => {
    const err = new Error("wix down");
    // 'upload' action
    itemsSave.mockRejectedValueOnce(err);
    await recordOwnerEdit(
      {
        actorEmail: "brenda@x.com",
        action: "upload",
        target: "p-kingston",
        before: "",
        after: "wix:image://v1/abc/hero.jpg",
      },
      tokens,
    );
    const uploadCall = sentryCaptureException.mock.calls.find(
      ([, opts]) =>
        (opts as { extra?: { action?: string } }).extra?.action === "upload",
    );
    expect(uploadCall).toBeDefined();
    expect(
      (uploadCall![1] as { extra: { target: string } }).extra.target,
    ).toBe("p-kingston");
  });
});

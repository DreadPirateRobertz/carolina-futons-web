// cfw-0nt: unit tests for the submitGuestReturn helper.
//
// Helper writes to Wix `Returns` collection via the unauthenticated
// client (guest-accessible flow per Wix Returns.js spec). Tests pin
// happy-path payload shape, RMA generation format, validation guards,
// details truncation, and the fail-soft return shape on Wix errors.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsert = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClient: vi.fn(() => ({
    items: {
      insert: (...args: unknown[]) => mockInsert(...args),
    },
  })),
}));

import { submitGuestReturn } from "@/lib/returns/return-submission";

const VALID_ARGS = {
  orderNumber: "10042",
  email: "buyer@example.com",
  reason: "defective" as const,
  details: "Latch broke after a week.",
  type: "return" as const,
};

beforeEach(() => {
  mockInsert.mockReset();
});

describe("submitGuestReturn — happy path", () => {
  it("inserts into Returns and returns { ok:true, rmaNumber, returnId }", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-1" });

    const result = await submitGuestReturn(VALID_ARGS);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // type-guard for TS
    expect(result.returnId).toBe("ret-1");
    expect(result.rmaNumber).toMatch(/^RMA-\d{8}-\d{4}$/);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const [collection, payload] = mockInsert.mock.calls[0];
    expect(collection).toBe("Returns");
    expect(payload).toMatchObject({
      orderNumber: "10042",
      memberEmail: "buyer@example.com",
      reason: "defective",
      reasonLabel: "Product defect",
      details: "Latch broke after a week.",
      type: "return",
      status: "requested",
    });
    expect(payload.rmaNumber).toBe(result.rmaNumber);
  });

  it("normalizes email to lowercase + trimmed before persisting", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-2" });
    await submitGuestReturn({
      ...VALID_ARGS,
      email: "  Buyer@Example.COM  ",
    });
    expect(mockInsert.mock.calls[0][1].memberEmail).toBe("buyer@example.com");
  });

  it("strips non-[A-Za-z0-9-] characters from orderNumber (global replace, keeps allowed chars)", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-3" });
    await submitGuestReturn({
      ...VALID_ARGS,
      orderNumber: "10042-A; DROP TABLE",
    });
    // The Wix backend sanitizes orderNumber identically — see
    // returnsService.web.js#submitGuestReturn. The regex is a global
    // replace, NOT a truncate-at-first-invalid; allowed chars after the
    // injection attempt are preserved alongside the prefix.
    expect(mockInsert.mock.calls[0][1].orderNumber).toBe("10042-ADROPTABLE");
  });

  it("defaults type to 'return' when not supplied", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-4" });
    const { type: _t, ...rest } = VALID_ARGS;
    void _t;
    await submitGuestReturn(rest as typeof VALID_ARGS);
    expect(mockInsert.mock.calls[0][1].type).toBe("return");
  });

  it("accepts 'exchange' as a valid type", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-5" });
    await submitGuestReturn({ ...VALID_ARGS, type: "exchange" });
    expect(mockInsert.mock.calls[0][1].type).toBe("exchange");
  });

  it("truncates details to 2000 chars (the Wix MAX_DETAILS_LEN)", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-6" });
    const longDetails = "x".repeat(3000);
    await submitGuestReturn({ ...VALID_ARGS, details: longDetails });
    const payload = mockInsert.mock.calls[0][1];
    expect(payload.details).toHaveLength(2000);
  });

  it("persists empty-string details when caller omits them", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-7" });
    const { details: _d, ...rest } = VALID_ARGS;
    void _d;
    await submitGuestReturn(rest as typeof VALID_ARGS);
    expect(mockInsert.mock.calls[0][1].details).toBe("");
  });
});

describe("submitGuestReturn — RMA generation", () => {
  it("formats today's date into the RMA prefix", async () => {
    mockInsert.mockResolvedValueOnce({ _id: "ret-8" });
    const result = await submitGuestReturn(VALID_ARGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(result.rmaNumber.startsWith(`RMA-${today}-`)).toBe(true);
  });

  it("generates a fresh RMA every call (random suffix)", async () => {
    mockInsert.mockResolvedValue({ _id: "ret-x" });
    const a = await submitGuestReturn(VALID_ARGS);
    const b = await submitGuestReturn(VALID_ARGS);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // Collision is astronomically unlikely with 4 random digits across
    // two calls; if this test flakes, the generator is broken.
    expect(a.rmaNumber).not.toBe(b.rmaNumber);
  });
});

describe("submitGuestReturn — validation", () => {
  it("returns { ok:false, reason:'invalid_input' } when orderNumber is empty", async () => {
    const result = await submitGuestReturn({ ...VALID_ARGS, orderNumber: "" });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid_input when orderNumber becomes empty after sanitization (no allowed chars survive)", async () => {
    // ';_!@#' has zero allowed chars (alphanumeric or dash), so sanitize
    // produces "" and the empty-string guard rejects it.
    const result = await submitGuestReturn({
      ...VALID_ARGS,
      orderNumber: ";_!@#",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid_input when orderNumber exceeds 50 chars", async () => {
    const result = await submitGuestReturn({
      ...VALID_ARGS,
      orderNumber: "1".repeat(51),
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });

  it("invalid_input when email is empty", async () => {
    const result = await submitGuestReturn({ ...VALID_ARGS, email: "" });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid_input when email has no @", async () => {
    const result = await submitGuestReturn({
      ...VALID_ARGS,
      email: "no-at-sign",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });

  it("invalid_input when reason isn't in the VALID_REASONS enum", async () => {
    const result = await submitGuestReturn({
      ...VALID_ARGS,
      // @ts-expect-error — deliberately exercise the runtime guard
      reason: "absolutely_not_a_reason",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });
});

describe("submitGuestReturn — Wix failures", () => {
  it("returns { ok:false, reason:'wix_error', status } on Wix error", async () => {
    mockInsert.mockRejectedValueOnce({ status: 502 });
    const result = await submitGuestReturn(VALID_ARGS);
    expect(result).toEqual({
      ok: false,
      reason: "wix_error",
      status: 502,
    });
  });

  it("returns { ok:false, reason:'wix_error' } on opaque error", async () => {
    mockInsert.mockRejectedValueOnce(new Error("network unreachable"));
    const result = await submitGuestReturn(VALID_ARGS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("wix_error");
    }
  });

  it("wix_error when insert resolves with no _id (malformed response)", async () => {
    mockInsert.mockResolvedValueOnce({});
    const result = await submitGuestReturn(VALID_ARGS);
    expect(result).toEqual({ ok: false, reason: "wix_error" });
  });
});

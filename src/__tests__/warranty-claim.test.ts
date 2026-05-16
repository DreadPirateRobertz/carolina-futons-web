// cfw-80n1: unit tests for submitWarrantyClaimForMember helper.
//
// Helper writes to Wix `WarrantyClaims` collection on behalf of a
// member. Tests pin happy-path payload + claim-number format, optional
// fields, description truncation/min-length, validation guards, and the
// fail-soft return shape on Wix errors.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsert = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: vi.fn(() => ({
    items: {
      insert: (...args: unknown[]) => mockInsert(...args),
    },
  })),
}));

import type { Tokens } from "@wix/sdk";
import { submitWarrantyClaimForMember } from "@/lib/warranty/warranty-claim";

const TOKENS = {
  accessToken: { value: "access-x", expiresAt: 0 },
  refreshToken: { value: "refresh-x", role: "member" },
} as unknown as Tokens;

const MEMBER_ID = "member-abc";
const CLAIM_ID = "claim-xyz";

const VALID_ARGS = {
  tokens: TOKENS,
  memberId: MEMBER_ID,
  issueType: "structural" as const,
  description: "Latch broke after three months of normal use.",
  contactEmail: "Buyer@Example.com",
  contactPhone: "555-1234",
  warrantyId: "warranty-1",
};

beforeEach(() => {
  mockInsert.mockReset();
});

describe("submitWarrantyClaimForMember — happy path", () => {
  it("inserts into WarrantyClaims and returns { ok, claimNumber, claimId }", async () => {
    mockInsert.mockResolvedValueOnce({ _id: CLAIM_ID });

    const result = await submitWarrantyClaimForMember(VALID_ARGS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claimId).toBe(CLAIM_ID);
    expect(result.claimNumber).toMatch(/^CLM-\d{8}-\d{4}$/);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const [collection, payload] = mockInsert.mock.calls[0];
    expect(collection).toBe("WarrantyClaims");
    expect(payload).toMatchObject({
      memberId: MEMBER_ID,
      issueType: "structural",
      description: "Latch broke after three months of normal use.",
      contactEmail: "buyer@example.com",
      contactPhone: "555-1234",
      warrantyId: "warranty-1",
      status: "submitted",
    });
    expect(payload.claimNumber).toBe(result.claimNumber);
    expect(typeof payload.submittedAt).toBe("string");
    expect(payload.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("lowercases + trims contactEmail before persisting", async () => {
    mockInsert.mockResolvedValueOnce({ _id: CLAIM_ID });
    await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      contactEmail: "  Buyer@Example.COM  ",
    });
    expect(mockInsert.mock.calls[0][1].contactEmail).toBe("buyer@example.com");
  });

  it("persists optional warrantyId + contactPhone as null when absent", async () => {
    mockInsert.mockResolvedValueOnce({ _id: CLAIM_ID });
    await submitWarrantyClaimForMember({
      tokens: TOKENS,
      memberId: MEMBER_ID,
      issueType: "fabric",
      description: "Discoloration on one cushion side.",
      contactEmail: "buyer@example.com",
      contactPhone: null,
      warrantyId: null,
    });
    const payload = mockInsert.mock.calls[0][1];
    expect(payload.warrantyId).toBeNull();
    expect(payload.contactPhone).toBeNull();
  });

  it("truncates description to 2000 chars (Wix MAX cap)", async () => {
    mockInsert.mockResolvedValueOnce({ _id: CLAIM_ID });
    const longDescription = "x".repeat(3000);
    await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      description: longDescription,
    });
    expect(mockInsert.mock.calls[0][1].description).toHaveLength(2000);
  });
});

describe("submitWarrantyClaimForMember — claim number generation", () => {
  it("formats today's date into the claim prefix", async () => {
    mockInsert.mockResolvedValueOnce({ _id: CLAIM_ID });
    const result = await submitWarrantyClaimForMember(VALID_ARGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(result.claimNumber.startsWith(`CLM-${today}-`)).toBe(true);
  });

  it("generates a fresh claim number per call (random suffix)", async () => {
    mockInsert.mockResolvedValue({ _id: "x" });
    const a = await submitWarrantyClaimForMember(VALID_ARGS);
    const b = await submitWarrantyClaimForMember(VALID_ARGS);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.claimNumber).not.toBe(b.claimNumber);
  });
});

describe("submitWarrantyClaimForMember — validation", () => {
  it("returns { ok:false, reason:'invalid_input' } when memberId is empty", async () => {
    const result = await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      memberId: "",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid_input when description is too short (<10 chars)", async () => {
    const result = await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      description: "broke",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid_input when description is whitespace only", async () => {
    const result = await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      description: "          ",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });

  it("invalid_input when contactEmail is malformed", async () => {
    const result = await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      contactEmail: "not-an-email",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });

  it("invalid_input when issueType isn't in the closed enum", async () => {
    const result = await submitWarrantyClaimForMember({
      ...VALID_ARGS,
      // @ts-expect-error — deliberately exercise the runtime guard
      issueType: "not_a_real_issue",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
  });
});

describe("submitWarrantyClaimForMember — Wix failures", () => {
  it("returns { ok:false, reason:'wix_error', status } on collection-not-found 404", async () => {
    mockInsert.mockRejectedValueOnce({ status: 404 });
    const result = await submitWarrantyClaimForMember(VALID_ARGS);
    expect(result).toEqual({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
  });

  it("returns wix_error on opaque error", async () => {
    mockInsert.mockRejectedValueOnce(new Error("network unreachable"));
    const result = await submitWarrantyClaimForMember(VALID_ARGS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("wix_error");
    }
  });

  it("returns wix_error when insert resolves with no _id (malformed response)", async () => {
    mockInsert.mockResolvedValueOnce({});
    const result = await submitWarrantyClaimForMember(VALID_ARGS);
    expect(result).toEqual({ ok: false, reason: "wix_error" });
  });
});

// cfw-1ud: unit tests for registerWarrantyForMember helper.
//
// Helper writes to the Wix `WarrantyRegistrations` collection on behalf of
// a member. Tests pin: happy path, missing/empty inputs, member-token
// requirement, Wix-error classification, and the fail-soft return shape
// that mirrors writeSiteContentHistory (cfw-jgl).

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
import { registerWarrantyForMember } from "@/lib/warranty/warranty-registration";

const TOKENS = {
  accessToken: { value: "access-x", expiresAt: 0 },
  refreshToken: { value: "refresh-x", role: "member" },
} as unknown as Tokens;

const MEMBER_ID = "member-abc";
const REGISTRATION_ID = "reg-xyz";

const VALID_ARGS = {
  tokens: TOKENS,
  memberId: MEMBER_ID,
  productId: "p-1",
  productName: "Carolina Classic Futon",
  orderId: "order-1",
  purchaseDate: new Date("2026-04-01").toISOString(),
  serialNumber: "SN-001",
};

beforeEach(() => {
  mockInsert.mockReset();
});

describe("registerWarrantyForMember — happy path", () => {
  it("inserts into WarrantyRegistrations and returns the new registrationId", async () => {
    mockInsert.mockResolvedValueOnce({ _id: REGISTRATION_ID });

    const result = await registerWarrantyForMember(VALID_ARGS);

    expect(result).toEqual({ ok: true, registrationId: REGISTRATION_ID });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const [collection, payload] = mockInsert.mock.calls[0];
    expect(collection).toBe("WarrantyRegistrations");
    expect(payload).toMatchObject({
      memberId: MEMBER_ID,
      productId: "p-1",
      productName: "Carolina Classic Futon",
      orderId: "order-1",
      serialNumber: "SN-001",
      purchaseDate: "2026-04-01T00:00:00.000Z",
      status: "active",
    });
    expect(typeof payload.registeredAt).toBe("string");
    // registeredAt is an ISO date stamp set by the helper, not the caller.
    expect(payload.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims productName whitespace before persisting", async () => {
    mockInsert.mockResolvedValueOnce({ _id: REGISTRATION_ID });
    await registerWarrantyForMember({
      ...VALID_ARGS,
      productName: "  Carolina Classic Futon  ",
    });
    expect(mockInsert.mock.calls[0][1].productName).toBe(
      "Carolina Classic Futon",
    );
  });

  it("persists optional fields as null when not provided", async () => {
    mockInsert.mockResolvedValueOnce({ _id: REGISTRATION_ID });
    await registerWarrantyForMember({
      tokens: TOKENS,
      memberId: MEMBER_ID,
      productId: "p-1",
      productName: "Carolina Classic Futon",
      orderId: null,
      purchaseDate: null,
      serialNumber: null,
    });
    const payload = mockInsert.mock.calls[0][1];
    expect(payload.orderId).toBeNull();
    expect(payload.purchaseDate).toBeNull();
    expect(payload.serialNumber).toBeNull();
  });
});

describe("registerWarrantyForMember — validation", () => {
  it("returns { ok:false, reason:'invalid_input' } when productName is empty", async () => {
    const result = await registerWarrantyForMember({
      ...VALID_ARGS,
      productName: "",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns invalid_input when productName is whitespace only", async () => {
    const result = await registerWarrantyForMember({
      ...VALID_ARGS,
      productName: "   ",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns invalid_input when productId is empty", async () => {
    const result = await registerWarrantyForMember({
      ...VALID_ARGS,
      productId: "",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns invalid_input when memberId is empty", async () => {
    const result = await registerWarrantyForMember({
      ...VALID_ARGS,
      memberId: "",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_input" });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("registerWarrantyForMember — Wix failure", () => {
  it("returns { ok:false, reason:'wix_error', status } on collection-not-found 404", async () => {
    mockInsert.mockRejectedValueOnce({ status: 404 });
    const result = await registerWarrantyForMember(VALID_ARGS);
    expect(result).toEqual({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
  });

  it("returns { ok:false, reason:'wix_error' } on opaque error", async () => {
    mockInsert.mockRejectedValueOnce(new Error("network unreachable"));
    const result = await registerWarrantyForMember(VALID_ARGS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("wix_error");
    }
  });

  it("returns wix_error when insert resolves but has no _id (malformed Wix response)", async () => {
    mockInsert.mockResolvedValueOnce({});
    const result = await registerWarrantyForMember(VALID_ARGS);
    expect(result).toEqual({ ok: false, reason: "wix_error" });
  });
});

// cfw-80n1: POST /api/warranty/claim tests.
//
// Member-auth gated. Body shape: { issueType, description, contactEmail,
// contactPhone?, warrantyId? }. Delegates persistence to
// submitWarrantyClaimForMember; route owns auth + body parsing + helper
// failure-mode → HTTP-status mapping.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: (...args: unknown[]) => mockGetMemberSession(...args),
}));

const mockSubmit = vi.fn();
vi.mock("@/lib/warranty/warranty-claim", () => ({
  submitWarrantyClaimForMember: (...args: unknown[]) => mockSubmit(...args),
}));

const VALID_SESSION = {
  tokens: {
    accessToken: { value: "a", expiresAt: 0 },
    refreshToken: { value: "r", role: "member" },
  },
  accessToken: "a",
  memberId: "member-1",
};

const VALID_BODY = {
  issueType: "structural",
  description: "Latch broke after three months of normal use.",
  contactEmail: "buyer@example.com",
  contactPhone: "555-1234",
  warrantyId: "warranty-1",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/warranty/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function route() {
  const mod = await import("@/app/api/warranty/claim/route");
  return mod.POST;
}

beforeEach(() => {
  mockGetMemberSession.mockReset();
  mockSubmit.mockReset();
});

describe("POST /api/warranty/claim — auth", () => {
  it("returns 401 when no member session", async () => {
    mockGetMemberSession.mockResolvedValueOnce(null);
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Member sign-in required.",
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

describe("POST /api/warranty/claim — body validation", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("returns 400 for malformed JSON", async () => {
    const POST = await route();
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("400 when issueType missing", async () => {
    const POST = await route();
    const { issueType: _o, ...body } = VALID_BODY;
    void _o;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/issueType/i);
  });

  it("400 when issueType is outside the closed enum", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, issueType: "not_real" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/issueType/i);
  });

  it("400 when description missing", async () => {
    const POST = await route();
    const { description: _d, ...body } = VALID_BODY;
    void _d;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/description/i);
  });

  it("400 when description is too short (<10 chars)", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, description: "broke" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/description/i);
  });

  it("400 when description exceeds 2000 chars", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, description: "x".repeat(2001) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/description/i);
  });

  it("400 when contactEmail missing", async () => {
    const POST = await route();
    const { contactEmail: _e, ...body } = VALID_BODY;
    void _e;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("400 when contactEmail malformed", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, contactEmail: "not-an-email" }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when contactPhone exceeds 20 chars", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, contactPhone: "x".repeat(21) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/contactPhone/i);
  });
});

describe("POST /api/warranty/claim — happy path", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("returns 200 + claimNumber + claimId on helper success", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      claimNumber: "CLM-20260515-0042",
      claimId: "claim-1",
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      claimNumber: "CLM-20260515-0042",
      claimId: "claim-1",
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const args = mockSubmit.mock.calls[0][0];
    expect(args.memberId).toBe("member-1");
    expect(args.issueType).toBe("structural");
    expect(args.contactEmail).toBe("buyer@example.com");
  });

  it("passes optional fields as null when caller omits them", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      claimNumber: "CLM-20260515-0001",
      claimId: "claim-2",
    });
    const POST = await route();
    const minimal = {
      issueType: "fabric",
      description: "Discoloration on one cushion side, near the seam.",
      contactEmail: "buyer@example.com",
    };
    await POST(makeRequest(minimal));
    const args = mockSubmit.mock.calls[0][0];
    expect(args.contactPhone).toBeNull();
    expect(args.warrantyId).toBeNull();
  });
});

describe("POST /api/warranty/claim — helper failure mapping", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("maps invalid_input → 400", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: false,
      reason: "invalid_input",
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
  });

  it("maps wix_error → 502", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 502,
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn'?t/i);
  });

  it("returns 500 when helper throws unexpectedly", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("boom"));
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

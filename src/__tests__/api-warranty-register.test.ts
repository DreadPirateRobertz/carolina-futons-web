// cfw-1ud: POST /api/warranty/register tests.
//
// Member-auth gated. Body shape: { productId, productName, orderId?,
// purchaseDate?, serialNumber? }. Delegates persistence to
// registerWarrantyForMember; this route owns auth + body parsing + the
// helper's failure-mode → HTTP-status mapping.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetMemberSession = vi.fn();
vi.mock("@/lib/auth/member", () => ({
  getMemberSession: (...args: unknown[]) => mockGetMemberSession(...args),
}));

const mockRegister = vi.fn();
vi.mock("@/lib/warranty/warranty-registration", () => ({
  registerWarrantyForMember: (...args: unknown[]) => mockRegister(...args),
}));

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
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
  productId: "p-1",
  productName: "Carolina Classic Futon",
  orderId: "order-1",
  purchaseDate: "2026-04-01T00:00:00.000Z",
  serialNumber: "SN-001",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/warranty/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function route() {
  const mod = await import("@/app/api/warranty/register/route");
  return mod.POST;
}

beforeEach(() => {
  mockGetMemberSession.mockReset();
  mockRegister.mockReset();
  mockLogError.mockClear();
});

describe("POST /api/warranty/register — auth", () => {
  it("returns 401 when no member session", async () => {
    mockGetMemberSession.mockResolvedValueOnce(null);
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Member sign-in required.",
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

describe("POST /api/warranty/register — body validation", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("returns 400 for malformed JSON", async () => {
    const POST = await route();
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when productId missing", async () => {
    const POST = await route();
    const { productId: _omit, ...body } = VALID_BODY;
    void _omit;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/productId/i);
  });

  it("returns 400 when productName missing", async () => {
    const POST = await route();
    const { productName: _omit, ...body } = VALID_BODY;
    void _omit;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/productName/i);
  });

  it("returns 400 when productName is empty / whitespace", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BODY, productName: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when productId / productName are not strings", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, productId: 12345 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when productName exceeds 200 chars", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, productName: "x".repeat(201) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/productName/i);
  });

  it("returns 400 when purchaseDate is not parseable", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, purchaseDate: "not-a-date" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/purchaseDate/i);
  });
});

describe("POST /api/warranty/register — happy path", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("returns 200 + registrationId on success", async () => {
    mockRegister.mockResolvedValueOnce({
      ok: true,
      registrationId: "reg-xyz",
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      registrationId: "reg-xyz",
    });
    expect(mockRegister).toHaveBeenCalledTimes(1);
    const args = mockRegister.mock.calls[0][0];
    expect(args.memberId).toBe("member-1");
    expect(args.productId).toBe("p-1");
    expect(args.productName).toBe("Carolina Classic Futon");
  });

  it("passes optional fields through as null when absent", async () => {
    mockRegister.mockResolvedValueOnce({
      ok: true,
      registrationId: "reg-1",
    });
    const POST = await route();
    const minimal = {
      productId: "p-1",
      productName: "Cody",
    };
    await POST(makeRequest(minimal));
    const args = mockRegister.mock.calls[0][0];
    expect(args.orderId).toBeNull();
    expect(args.purchaseDate).toBeNull();
    expect(args.serialNumber).toBeNull();
  });
});

describe("POST /api/warranty/register — helper failure mapping", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("maps invalid_input → 400", async () => {
    mockRegister.mockResolvedValueOnce({
      ok: false,
      reason: "invalid_input",
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
  });

  it("maps wix_error → 502", async () => {
    mockRegister.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 404,
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn'?t/i);
  });

  it("returns 500 when the helper throws unexpectedly", async () => {
    mockRegister.mockRejectedValueOnce(new Error("boom"));
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

// Logger migration (cfw-logger batch 18): the outer try/catch now
// forwards unexpected throws to logError so 500-class failures land in
// Sentry with source="warranty/register".
describe("POST /api/warranty/register — logError migration", () => {
  beforeEach(() => mockGetMemberSession.mockResolvedValue(VALID_SESSION));

  it("calls logError with source='warranty/register' op='POST' when the handler throws", async () => {
    const handlerErr = new Error("kaboom inside registerWarrantyForMember");
    mockRegister.mockRejectedValueOnce(handlerErr);

    const POST = await route();
    await POST(makeRequest(VALID_BODY));

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("warranty/register");
    expect(op).toBe("POST");
    expect(err).toBe(handlerErr);
  });

  it("returns the user-facing 500 body even though logError fires", async () => {
    mockRegister.mockRejectedValueOnce(new Error("boom"));
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/unexpected/i);
  });

  it("does NOT call logError on the 400 validation path (handled, not Sentry-worthy)", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, productId: undefined }),
    );
    expect(res.status).toBe(400);
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

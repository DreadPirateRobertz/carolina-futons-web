// cfw-0nt: POST /api/returns/submit tests.
//
// Guest-accessible (no member auth). Body shape: { orderNumber, email,
// reason, details?, type? }. Delegates persistence to submitGuestReturn;
// this route owns body parsing + the helper's failure-mode → HTTP-status
// mapping.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockSubmit = vi.fn();
vi.mock("@/lib/returns/return-submission", () => ({
  submitGuestReturn: (...args: unknown[]) => mockSubmit(...args),
}));

const VALID_BODY = {
  orderNumber: "10042",
  email: "buyer@example.com",
  reason: "defective",
  details: "Latch broke after a week.",
  type: "return",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/returns/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function route() {
  const mod = await import("@/app/api/returns/submit/route");
  return mod.POST;
}

beforeEach(() => {
  mockSubmit.mockReset();
});

describe("POST /api/returns/submit — body validation (no helper call)", () => {
  it("returns 400 for malformed JSON", async () => {
    const POST = await route();
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("400 when orderNumber missing", async () => {
    const POST = await route();
    const { orderNumber: _o, ...body } = VALID_BODY;
    void _o;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/orderNumber/i);
  });

  it("400 when orderNumber is not a string", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BODY, orderNumber: 12345 }));
    expect(res.status).toBe(400);
  });

  it("400 when email missing", async () => {
    const POST = await route();
    const { email: _e, ...body } = VALID_BODY;
    void _e;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("400 when email is not a string", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BODY, email: null }));
    expect(res.status).toBe(400);
  });

  it("400 when reason missing", async () => {
    const POST = await route();
    const { reason: _r, ...body } = VALID_BODY;
    void _r;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/reason/i);
  });

  it("400 when reason is not in the closed enum", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, reason: "absolutely_not_a_reason" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/reason/i);
  });

  it("400 when details exceeds 2000 chars", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, details: "x".repeat(2001) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/details/i);
  });

  it("400 when type is neither 'return' nor 'exchange'", async () => {
    const POST = await route();
    const res = await POST(
      makeRequest({ ...VALID_BODY, type: "rental" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/type/i);
  });
});

describe("POST /api/returns/submit — happy path", () => {
  it("returns 200 + rmaNumber + returnId on helper success", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      rmaNumber: "RMA-20260515-0042",
      returnId: "ret-1",
    });
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      rmaNumber: "RMA-20260515-0042",
      returnId: "ret-1",
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const args = mockSubmit.mock.calls[0][0];
    expect(args.orderNumber).toBe("10042");
    expect(args.email).toBe("buyer@example.com");
    expect(args.reason).toBe("defective");
    expect(args.type).toBe("return");
  });

  it("treats missing 'type' as the helper's default (omits from passthrough)", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      rmaNumber: "RMA-20260515-0001",
      returnId: "ret-2",
    });
    const POST = await route();
    const { type: _t, ...body } = VALID_BODY;
    void _t;
    await POST(makeRequest(body));
    const args = mockSubmit.mock.calls[0][0];
    // Route forwards `undefined` so the helper picks its own default.
    expect(args.type).toBeUndefined();
  });

  it("passes empty-string details through to the helper", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      rmaNumber: "RMA-20260515-0099",
      returnId: "ret-3",
    });
    const POST = await route();
    const { details: _d, ...body } = VALID_BODY;
    void _d;
    await POST(makeRequest(body));
    const args = mockSubmit.mock.calls[0][0];
    expect(args.details).toBeUndefined();
  });
});

describe("POST /api/returns/submit — helper failure mapping", () => {
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

  it("returns 500 when the helper throws unexpectedly", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("boom"));
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

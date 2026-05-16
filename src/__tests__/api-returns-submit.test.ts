// cfw-0nt: POST /api/returns/submit tests.
//
// Guest-accessible (no member auth). Body shape: { orderNumber, email,
// reason, details?, type? }. Delegates persistence to submitGuestReturn;
// this route owns body parsing + the helper's failure-mode → HTTP-status
// mapping.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// cfw-yidm: route catch now routes through logError → Sentry. Mock
// @sentry/nextjs so the runner doesn't ship events AND the new
// logError-integration describe below can assert (scope, op) tags.
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

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
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
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
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

// cfw-yidm: pin logError integration on the route's catch. A guest
// returns submission silently 500'ing was previously invisible to ops
// — the buyer sees "Unexpected error" and walks away. Sentry now
// captures it so customer-success can reach out before the buyer
// churns.
describe("POST /api/returns/submit — logError integration on unexpected helper throw", () => {
  it("captures with scope='/api/returns/submit' + op='unexpected error' + flush(2000)", async () => {
    const thrown = new Error("downstream helper boom");
    mockSubmit.mockRejectedValueOnce(thrown);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(500);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/unexpected/i);

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "/api/returns/submit",
      op: "unexpected error",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect(sentryFlush).toHaveBeenCalledWith(2000);
    consoleSpy.mockRestore();
  });

  it("happy-path (helper resolves ok:true) does NOT call Sentry", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      rmaNumber: "RMA-1",
      returnId: "RET-1",
    });

    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("ok:false soft-fail (helper returns wix_error → 502) does NOT call Sentry — that's the documented graceful-fail path, not a throw", async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: false,
      reason: "wix_error",
      status: 502,
    });

    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(502);
    // The route surfaces 502 to the client but does NOT log to Sentry
    // for the soft-fail return — the helper has its own internal
    // Sentry capture for the Wix call. Double-logging would
    // double-count outages.
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("validation 400 (no helper call) does NOT call Sentry — user input, not an outage", async () => {
    const POST = await route();
    const res = await POST(makeRequest({ ...VALID_BODY, email: "" }));

    expect(res.status).toBe(400);
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});

// cfw-8cnr: coverage for the catch paths in
// src/app/api/swatch-request/route.ts (HTTP endpoint variant). The
// Server Action variant (src/app/actions/swatch-request.ts) has its
// own captureWithId helper; this route is the plain fetch entry
// point used by external clients (mobile, embedded forms).
//
// Two diagnostic branches:
//   1. non-2xx from Velo → 502 + logError op='Velo responded'
//   2. fetch throw / timeout → 502 + logError op='fetch failed'
// Both share scope='swatch-request' with the Server Action (so they
// roll up together) but have route='/api/swatch-request' in extra
// to split surfaces.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn().mockResolvedValue(true);
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
  flush: (timeoutMs?: number) => sentryFlush(timeoutMs),
}));

const fetchMock = vi.fn<typeof fetch>();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

// Valid body shape — contactInfo with all required fields populated.
const VALID_BODY = {
  swatchIds: ["sw-001", "sw-002"],
  contactInfo: {
    firstName: "Brenda",
    lastName: "Smith",
    email: "brenda@example.com",
    phone: "555-0100",
    address1: "123 Main St",
    address2: "",
    city: "Asheville",
    state: "NC",
    zip: "28801",
  },
  productSlug: "kingston-queen",
};

function req(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

beforeEach(() => {
  sentryCaptureException.mockReset();
  sentryFlush.mockReset().mockResolvedValue(true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  consoleError.mockClear();
  vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("/api/swatch-request — logError integration on non-2xx Velo response", () => {
  it.each([400, 500, 502, 503])(
    "%d response → captures scope='swatch-request' + op='Velo responded' + extra { status, route }",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const { POST } = await import("@/app/api/swatch-request/route");
      const res = await POST(req(VALID_BODY));

      // 502 upstream-dependency fault — matches the notify-me /
      // returns-submit pattern (cf this PR chain's siblings).
      expect(res.status).toBe(502);
      const json = (await res.json()) as { ok: boolean; error?: string };
      expect(json).toEqual({ ok: false, error: "velo-error" });

      const matching = sentryCaptureException.mock.calls.find(
        ([, opts]) =>
          (opts as { extra?: { status?: number } }).extra?.status === status,
      );
      expect(matching).toBeDefined();
      const [, opts] = matching!;
      expect((opts as { tags: Record<string, string> }).tags).toEqual({
        scope: "swatch-request",
        op: "Velo responded",
      });
      expect((opts as { level: string }).level).toBe("error");
      expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
        status,
        route: "/api/swatch-request",
      });
      expect(sentryFlush).toHaveBeenCalledWith(2000);
    },
  );
});

describe("/api/swatch-request — logError integration on fetch throw", () => {
  it("captures the thrown Error with scope='swatch-request' + op='fetch failed' + route extra", async () => {
    const thrown = new TypeError("network down");
    fetchMock.mockRejectedValueOnce(thrown);

    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(req(VALID_BODY));

    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json).toEqual({ ok: false, error: "velo-unreachable" });

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "swatch-request",
      op: "fetch failed",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      route: "/api/swatch-request",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });
});

describe("/api/swatch-request — happy + short-circuit paths do NOT call Sentry", () => {
  it("200 from Velo → { ok: true } and no Sentry call", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(req(VALID_BODY));

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json).toEqual({ ok: true });
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("WIX_VELO_SITE_URL unset → 200 ack without fetching or logging (CI/dev path)", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");

    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(req(VALID_BODY));

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("validation 400 (empty swatchIds) → never reaches catch, no Sentry call", async () => {
    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(req({ ...VALID_BODY, swatchIds: [] }));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("validation 400 (missing email) → never reaches catch, no Sentry call", async () => {
    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(
      req({
        ...VALID_BODY,
        contactInfo: { ...VALID_BODY.contactInfo, email: "" },
      }),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("invalid-json body → 400 without Sentry call", async () => {
    const badReq = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Request;

    const { POST } = await import("@/app/api/swatch-request/route");
    const res = await POST(badReq);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json).toEqual({ ok: false, error: "invalid-json" });
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});

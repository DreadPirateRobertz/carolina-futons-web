// cfw-g9sw: coverage for the catch paths in
// src/app/api/notify-me/route.ts. Companion to cfw-2bmf which migrated
// the server-action variant (src/app/actions/notify-me.ts). The route
// is the JSON HTTP entry point — PDP back-in-stock subscriptions call
// it via fetch. Two diagnostic branches matter:
//   1. non-2xx from Velo → 502 + logError op='Velo responded'
//   2. fetch throw / timeout → 502 + logError op='fetch failed'
//
// Both share scope='notify-me' with the server action. The extra has
// route='/api/notify-me' so a Sentry view can split-by-route between
// the two emit surfaces.

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

describe("/api/notify-me — logError integration on non-2xx Velo response", () => {
  it.each([400, 403, 500, 502, 503])(
    "%d response → captures scope='notify-me' + op='Velo responded' + extra { status, route }",
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const { POST } = await import("@/app/api/notify-me/route");
      const res = await POST(
        req({ email: "b@example.com", productId: "p-1" }),
      );

      // 502 (Bad Gateway) — upstream-dependency fault.
      expect(res.status).toBe(502);
      const json = (await res.json()) as { ok: boolean; error?: string };
      expect(json).toEqual({ ok: false, error: "velo-error" });

      // The it.each loop runs sequentially with a beforeEach reset.
      // Find by status to avoid coupling to a single mock call index.
      const matching = sentryCaptureException.mock.calls.find(
        ([, opts]) =>
          (opts as { extra?: { status?: number } }).extra?.status === status,
      );
      expect(matching).toBeDefined();
      const [, opts] = matching!;
      expect((opts as { tags: Record<string, string> }).tags).toEqual({
        scope: "notify-me",
        op: "Velo responded",
      });
      expect((opts as { level: string }).level).toBe("error");
      expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
        status,
        route: "/api/notify-me",
      });
      expect(sentryFlush).toHaveBeenCalledWith(2000);
    },
  );
});

describe("/api/notify-me — logError integration on fetch throw", () => {
  it("captures the thrown Error with scope='notify-me' + op='fetch failed' + route extra", async () => {
    const thrown = new TypeError("network down");
    fetchMock.mockRejectedValueOnce(thrown);

    const { POST } = await import("@/app/api/notify-me/route");
    const res = await POST(req({ email: "b@example.com", productId: "p-1" }));

    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json).toEqual({ ok: false, error: "velo-unreachable" });

    expect(sentryCaptureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryCaptureException.mock.calls[0]!;
    expect(reportedErr).toBe(thrown);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "notify-me",
      op: "fetch failed",
    });
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      route: "/api/notify-me",
    });
    expect(sentryFlush).toHaveBeenCalledWith(2000);
  });
});

describe("/api/notify-me — happy + short-circuit paths do NOT call Sentry", () => {
  it("200 from Velo → { ok: true } and no Sentry call", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { POST } = await import("@/app/api/notify-me/route");
    const res = await POST(req({ email: "b@example.com", productId: "p-1" }));

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json).toEqual({ ok: true });
    expect(sentryCaptureException).not.toHaveBeenCalled();
    expect(sentryFlush).not.toHaveBeenCalled();
  });

  it("WIX_VELO_SITE_URL unset → 200 ack without fetching or logging (CI/dev path)", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");

    const { POST } = await import("@/app/api/notify-me/route");
    const res = await POST(req({ email: "b@example.com", productId: "p-1" }));

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid-email", { email: "bademail", productId: "p-1" }, "invalid-email"],
    ["missing-email", { email: "", productId: "p-1" }, "invalid-email"],
    ["missing-productId", { email: "b@example.com", productId: "" }, "missing-productId"],
  ])("400 %s → never reaches catch, no Sentry call", async (_label, body, expectedError) => {
    const { POST } = await import("@/app/api/notify-me/route");
    const res = await POST(req(body));

    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json).toEqual({ ok: false, error: expectedError });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("invalid-json body → 400 without Sentry call", async () => {
    const badReq = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Request;

    const { POST } = await import("@/app/api/notify-me/route");
    const res = await POST(badReq);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error?: string };
    expect(json).toEqual({ ok: false, error: "invalid-json" });
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});

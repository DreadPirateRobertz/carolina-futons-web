import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Covers the logError migration for /api/notify-me. Two error paths:
//   - Velo HTTP non-2xx → logError("notify-me", "Velo responded with non-2xx", res.status)
//   - fetch reject       → logError("notify-me", "fetch failed", err)
//
// Asserts on the console.error sink because logError forwards there in
// every env; the Sentry forwarder is prod-only and unit-tested in
// log.test.ts.

const TEST_VELO_BASE = "https://www.example-velo.com";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/notify-me", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: "back-in-stock@example.com",
  productId: "kingston-futon-frame",
};

let fetchMock: ReturnType<typeof vi.fn>;
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("WIX_VELO_SITE_URL", TEST_VELO_BASE);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errSpy.mockRestore();
});

async function route() {
  const mod = await import("@/app/api/notify-me/route");
  return mod.POST;
}

describe("POST /api/notify-me — logError migration", () => {
  it("emits '[notify-me] Velo responded with non-2xx' with the status as the second arg on Velo non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("upstream down", { status: 503 }),
    );
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("velo-error");
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe(
      "[notify-me] Velo responded with non-2xx",
    );
    expect(errSpy.mock.calls[0]![1]).toBe(503);
  });

  it("emits '[notify-me] fetch failed' with the thrown err on fetch reject", async () => {
    const thrown = new Error("ECONNRESET");
    fetchMock.mockRejectedValueOnce(thrown);
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("velo-unreachable");
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]![0]).toBe("[notify-me] fetch failed");
    expect(errSpy.mock.calls[0]![1]).toBe(thrown);
  });

  it("does NOT log on the happy path (Velo 2xx)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const POST = await route();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(errSpy).not.toHaveBeenCalled();
  });
});

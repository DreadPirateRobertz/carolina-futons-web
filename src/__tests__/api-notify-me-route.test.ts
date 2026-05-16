// cfw-qv2i: contract tests for /api/notify-me's logError migration.
// Three cases pin the two distinct ops + happy path:
//   1. Happy 200 → no logError
//   2. Velo HTTP non-ok → logError op=veloResponse with httpStatus
//   3. fetch throws → logError op=fetch (different alert threshold)

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  mockLogError.mockReset();
  vi.unstubAllGlobals();
  process.env.WIX_VELO_SITE_URL = "https://velo.example.com";
});

async function callPost(body: unknown) {
  const { POST } = await import("@/app/api/notify-me/route");
  const req = new Request("http://localhost/api/notify-me", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/notify-me (cfw-qv2i)", () => {
  it("happy path: 200 ok, no logError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 })),
    );
    const res = await callPost({ email: "a@b.com", productId: "p1" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("Velo HTTP non-ok: 502 + logError op=veloResponse with httpStatus", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })),
    );
    const res = await callPost({ email: "a@b.com", productId: "p1" });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body).toEqual({ ok: false, error: "velo-error" });
    expect(mockLogError).toHaveBeenCalledWith(
      "api/notify-me",
      "veloResponse",
      expect.any(Error),
      expect.objectContaining({ httpStatus: 503 }),
    );
  });

  it("fetch throws: 502 velo-unreachable + logError op=fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network down")),
    );
    const res = await callPost({ email: "a@b.com", productId: "p1" });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body).toEqual({ ok: false, error: "velo-unreachable" });
    expect(mockLogError).toHaveBeenCalledWith(
      "api/notify-me",
      "fetch",
      expect.any(Error),
    );
  });
});

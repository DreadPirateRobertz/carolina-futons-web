import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("callVelo", () => {
  it("POSTs to /_functions/<method> with args body and Bearer token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, items: [1, 2] }));
    const { callVelo } = await import("@/lib/wix/velo-client");
    const result = await callVelo<{ ok: boolean; items: number[] }>({
      method: "wishlistService/getWishlist",
      args: [],
      accessToken: "bearer-abc",
    });
    expect(result).toEqual({ ok: true, items: [1, 2] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://www.carolinafutons.com/_functions/wishlistService/getWishlist",
    );
    const req = init as RequestInit;
    expect(req.method).toBe("POST");
    expect(req.cache).toBe("no-store");
    const headers = req.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers.authorization).toBe("Bearer bearer-abc");
    expect(req.body).toBe(JSON.stringify({ args: [] }));
  });

  it("omits Authorization header when no accessToken provided (Anyone endpoints)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ rows: [] }));
    const { callVelo } = await import("@/lib/wix/velo-client");
    await callVelo({
      method: "gamificationCore/getLeaderboard",
      args: [10, null],
    });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it("throws VeloRpcError with status + method on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));
    const { callVelo, VeloRpcError } = await import("@/lib/wix/velo-client");
    await expect(
      callVelo({ method: "loyaltyService/getMyLoyaltyAccount", args: [], accessToken: "t" }),
    ).rejects.toBeInstanceOf(VeloRpcError);
  });

  it("trims trailing slash from WIX_VELO_SITE_URL", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "https://www.carolinafutons.com/");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const { callVelo } = await import("@/lib/wix/velo-client");
    await callVelo({ method: "x", args: [] });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://www.carolinafutons.com/_functions/x",
    );
  });
});

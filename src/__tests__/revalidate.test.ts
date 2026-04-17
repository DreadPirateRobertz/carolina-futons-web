import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

const SECRET = "test-secret";

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}

async function post(body: string, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/revalidate/route");
  const req = new Request("http://localhost/api/revalidate", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
  return POST(req as never);
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_WEBHOOK_SECRET", SECRET);
  });

  it("rejects requests without a signature", async () => {
    const res = await post(JSON.stringify({ collectionId: "Promotions" }));
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid signature", async () => {
    const body = JSON.stringify({ collectionId: "Promotions" });
    const res = await post(body, { "x-wix-signature": "sha256=deadbeef" });
    expect(res.status).toBe(401);
  });

  it("revalidates derived tags when signature matches", async () => {
    const body = JSON.stringify({ collectionId: "Promotions", itemId: "abc123" });
    const res = await post(body, { "x-wix-signature": sign(body) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; revalidated: string[] };
    expect(json.ok).toBe(true);
    expect(json.revalidated).toEqual(
      expect.arrayContaining(["wix:collection:Promotions", "wix:item:abc123"]),
    );

    const { revalidateTag } = await import("next/cache");
    expect(revalidateTag).toHaveBeenCalledWith("wix:collection:Promotions", "default");
    expect(revalidateTag).toHaveBeenCalledWith("wix:item:abc123", "default");
  });

  it("returns 500 when WIX_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("WIX_WEBHOOK_SECRET", "");
    const res = await post("{}", { "x-wix-signature": "sha256=deadbeef" });
    expect(res.status).toBe(500);
  });
});

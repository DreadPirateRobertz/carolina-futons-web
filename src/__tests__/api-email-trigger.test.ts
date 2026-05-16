// cfw-xm49: contract tests for /api/email/trigger logError migration.
// Pins the three failure paths: happy (no log), VeloRpcError (httpStatus +
// veloBody in extras), unexpected throw (httpStatus undefined).

import { describe, it, expect, vi, beforeEach } from "vitest";

const veloMocks = vi.hoisted(() => ({
  callVelo: vi.fn(),
}));

vi.mock("@/lib/wix/velo-client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/wix/velo-client")>(
      "@/lib/wix/velo-client",
    );
  return { ...actual, callVelo: veloMocks.callVelo };
});

const mockLogError = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

beforeEach(() => {
  veloMocks.callVelo.mockReset();
  mockLogError.mockReset();
  // Defensive: clear fixture-mode flag so the route exercises the Velo
  // branch and isn't short-circuited by NEXT_PUBLIC_USE_FIXTURE_PRODUCTS.
  process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS = "0";
});

async function callPost(body: unknown) {
  const { POST } = await import("@/app/api/email/trigger/route");
  const req = new Request("http://localhost/api/email/trigger", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as Parameters<typeof POST>[0]);
}

describe("POST /api/email/trigger (cfw-xm49)", () => {
  it("welcome happy path: queues, returns ok:true, does NOT call logError", async () => {
    veloMocks.callVelo.mockResolvedValueOnce(undefined);
    const res = await callPost({ type: "welcome", email: "b@example.com" });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
    expect(veloMocks.callVelo).toHaveBeenCalledWith({
      method: "queueWelcomeEmail",
      args: [{ type: "welcome", email: "b@example.com" }],
    });
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("VeloRpcError: logs with httpStatus + veloBody in extras, returns ok:false", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    veloMocks.callVelo.mockRejectedValueOnce(
      new VeloRpcError("queueWelcomeEmail", 429, "rate limited"),
    );
    const res = await callPost({ type: "welcome", email: "b@example.com" });
    // Non-fatal — route still returns 200 so the primary user flow continues.
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data).toEqual({ ok: false, error: "trigger-failed" });
    expect(mockLogError).toHaveBeenCalledWith(
      "email/trigger",
      "queueWelcomeEmail",
      expect.any(VeloRpcError),
      expect.objectContaining({ httpStatus: 429, veloBody: "rate limited" }),
    );
  });

  it("unexpected error: logs with httpStatus undefined, still returns ok:false", async () => {
    veloMocks.callVelo.mockRejectedValueOnce(new Error("connection refused"));
    const res = await callPost({
      type: "cart-recovery",
      items: [{ productId: "p1", quantity: 1 }],
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(false);
    expect(mockLogError).toHaveBeenCalledWith(
      "email/trigger",
      "queueCartRecovery",
      expect.any(Error),
      expect.objectContaining({
        httpStatus: undefined,
        veloBody: undefined,
      }),
    );
  });
});

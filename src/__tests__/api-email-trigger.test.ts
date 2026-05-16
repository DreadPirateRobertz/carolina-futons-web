import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const mockCallVelo = vi.hoisted(() => vi.fn());
vi.mock("@/lib/wix/velo-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wix/velo-client")>(
    "@/lib/wix/velo-client",
  );
  return { ...actual, callVelo: mockCallVelo };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_USE_FIXTURE_PRODUCTS", "");
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/email/trigger", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Logger migration (cfw-logger batch 19): the Velo-call catch now forwards
// to logError. Op tag splits VeloRpcError (status-bearing HTTP-level
// failures) from generic throws so Sentry can group rpc vs network issues.
describe("POST /api/email/trigger — logError migration", () => {
  it("calls logError with op='queueWelcomeEmail' on a generic (non-Velo) throw", async () => {
    const networkErr = new Error("network down");
    mockCallVelo.mockRejectedValueOnce(networkErr);

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "a@b.com" }) as Parameters<
        typeof POST
      >[0],
    );

    // Endpoint is intentionally non-fatal — returns 200 even on failure.
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(false);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op, err] = mockLogError.mock.calls[0];
    expect(source).toBe("email/trigger");
    expect(op).toBe("queueWelcomeEmail");
    expect(err).toBe(networkErr);
  });

  it("calls logError with op='queueWelcomeEmail.rpc' on a VeloRpcError", async () => {
    const { VeloRpcError } = await import("@/lib/wix/velo-client");
    mockCallVelo.mockRejectedValueOnce(
      new VeloRpcError("queueWelcomeEmail", 503, "service unavailable"),
    );

    const { POST } = await import("@/app/api/email/trigger/route");
    await POST(
      makeReq({ type: "welcome", email: "a@b.com" }) as Parameters<
        typeof POST
      >[0],
    );

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][1]).toBe("queueWelcomeEmail.rpc");
  });

  it("uses op='queueCartRecovery' for the cart-recovery trigger type", async () => {
    mockCallVelo.mockRejectedValueOnce(new Error("network down"));

    const { POST } = await import("@/app/api/email/trigger/route");
    await POST(
      makeReq({
        type: "cart-recovery",
        items: [{ productId: "p1", quantity: 1 }],
      }) as Parameters<typeof POST>[0],
    );

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][1]).toBe("queueCartRecovery");
  });

  it("does NOT call logError when Velo succeeds (happy path)", async () => {
    mockCallVelo.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/email/trigger/route");
    const res = await POST(
      makeReq({ type: "welcome", email: "a@b.com" }) as Parameters<
        typeof POST
      >[0],
    );
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

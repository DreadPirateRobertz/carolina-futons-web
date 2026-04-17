import { describe, it, expect, vi, beforeEach } from "vitest";

describe("wix-client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when NEXT_PUBLIC_WIX_CLIENT_ID is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_WIX_CLIENT_ID", "");
    await expect(
      import("@/lib/wix-client")
    ).rejects.toThrow("NEXT_PUBLIC_WIX_CLIENT_ID is not set");
  });

  it("exports getWixClient when env var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_WIX_CLIENT_ID", "test-client-id");
    const mod = await import("@/lib/wix-client");
    expect(mod.getWixClient).toBeDefined();
    expect(typeof mod.getWixClient).toBe("function");
  });
});

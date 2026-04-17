import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("wix-client", () => {
  const originalEnv = process.env.WIX_CLIENT_ID_HEADLESS;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.WIX_CLIENT_ID_HEADLESS = originalEnv;
  });

  it("throws when WIX_CLIENT_ID_HEADLESS is not set", async () => {
    vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "");
    const mod = await import("@/lib/wix-client");
    expect(() => mod.getWixClient()).toThrow("WIX_CLIENT_ID_HEADLESS is not set");
  });

  it("returns a client when env var is set", async () => {
    vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
    const mod = await import("@/lib/wix-client");
    const client = mod.getWixClient();
    expect(client).toBeDefined();
    expect(client.products).toBeDefined();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

describe("getWixClientWithTokens", () => {
  const originalEnv = process.env.WIX_CLIENT_ID_HEADLESS;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
  });

  afterEach(() => {
    process.env.WIX_CLIENT_ID_HEADLESS = originalEnv;
  });

  it("returns a client when called with no tokens (anonymous visitor)", async () => {
    const mod = await import("@/lib/wix-client");
    const client = mod.getWixClientWithTokens();
    expect(client).toBeDefined();
    expect(client.members).toBeDefined();
  });

  it("returns a client when called with member tokens", async () => {
    const mod = await import("@/lib/wix-client");
    const tokens: Tokens = {
      accessToken: { value: "access-abc", expiresAt: 1_780_000_000 },
      refreshToken: {
        value: "refresh-xyz",
        role: "member" as Tokens["refreshToken"]["role"],
      },
    };
    const client = mod.getWixClientWithTokens(tokens);
    expect(client).toBeDefined();
    expect(client.members).toBeDefined();
    expect(client.currentCart).toBeDefined();
  });

  it("throws when WIX_CLIENT_ID_HEADLESS is missing", async () => {
    vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "");
    const mod = await import("@/lib/wix-client");
    expect(() => mod.getWixClientWithTokens()).toThrow(/WIX_CLIENT_ID_HEADLESS/);
  });
});

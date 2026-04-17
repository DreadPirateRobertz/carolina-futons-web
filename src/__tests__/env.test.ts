import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env accessors", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("env() returns the value when set", async () => {
    vi.stubEnv("WIX_CLIENT_ID_HEADLESS", "test-client-id");
    const { env } = await import("@/lib/env");
    expect(env("WIX_CLIENT_ID_HEADLESS")).toBe("test-client-id");
    vi.unstubAllEnvs();
  });

  it("env() throws with a descriptive message when unset", async () => {
    vi.stubEnv("WIX_BACKEND_KEY", "");
    const { env } = await import("@/lib/env");
    expect(() => env("WIX_BACKEND_KEY")).toThrow(/Missing required env var/);
    vi.unstubAllEnvs();
  });

  it("optionalEnv() falls back to default when unset", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "");
    const { optionalEnv } = await import("@/lib/env");
    expect(optionalEnv("WIX_VELO_SITE_URL")).toBe(
      "https://www.carolinafutons.com",
    );
    vi.unstubAllEnvs();
  });

  it("optionalEnv() returns override when set", async () => {
    vi.stubEnv("WIX_VELO_SITE_URL", "https://staging.example.com");
    const { optionalEnv } = await import("@/lib/env");
    expect(optionalEnv("WIX_VELO_SITE_URL")).toBe(
      "https://staging.example.com",
    );
    vi.unstubAllEnvs();
  });
});

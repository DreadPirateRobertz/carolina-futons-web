// cfw-yp4: precedence chain for resolveSiteBase. 4-branch env-var
// fallback used by sitemap.ts AND robots.ts. Wrong order would put
// VERCEL_URL above NEXT_PUBLIC_SITE_URL, sending the canonical sitemap
// link to a per-deploy preview URL that 404s after the deploy ages out.
//
// The function reads process.env at call time, so each branch is tested
// by stubbing the relevant vars and clearing the higher-precedence ones.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { resolveSiteBase } from "@/app/sitemap";

beforeEach(() => {
  // Clear all 3 vars; each test stubs back what it cares about.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveSiteBase — env-var precedence", () => {
  it("Tier 1: NEXT_PUBLIC_SITE_URL wins over both VERCEL_* vars", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://carolinafutons.com");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "carolina-futons-web.vercel.app");
    vi.stubEnv("VERCEL_URL", "carolina-futons-web-abc123.vercel.app");

    expect(resolveSiteBase()).toBe("https://carolinafutons.com");
  });

  it("Tier 1: strips trailing slashes from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://carolinafutons.com/");
    expect(resolveSiteBase()).toBe("https://carolinafutons.com");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://carolinafutons.com///");
    expect(resolveSiteBase()).toBe("https://carolinafutons.com");
  });

  it("Tier 2: VERCEL_PROJECT_PRODUCTION_URL fallback when NEXT_PUBLIC_SITE_URL absent", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "carolina-futons-web.vercel.app");
    vi.stubEnv("VERCEL_URL", "carolina-futons-web-abc123.vercel.app");

    // PROD URL wins over per-deploy URL — important because per-deploy
    // URLs (VERCEL_URL) age out after the deploy is replaced.
    expect(resolveSiteBase()).toBe("https://carolina-futons-web.vercel.app");
  });

  it("Tier 3: VERCEL_URL fallback when both higher-tier vars absent (preview deploys)", () => {
    vi.stubEnv("VERCEL_URL", "carolina-futons-web-abc123.vercel.app");

    expect(resolveSiteBase()).toBe(
      "https://carolina-futons-web-abc123.vercel.app",
    );
  });

  it("Tier 4: localhost:3000 when ALL three vars absent (local dev)", () => {
    expect(resolveSiteBase()).toBe("http://localhost:3000");
  });

  it("VERCEL_PROJECT_PRODUCTION_URL is preferred over VERCEL_URL on Vercel deploys", () => {
    // Both set; the per-deploy URL must NOT win.
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "stable.example.com");
    vi.stubEnv("VERCEL_URL", "preview-abc.example.com");

    expect(resolveSiteBase()).toBe("https://stable.example.com");
  });
});

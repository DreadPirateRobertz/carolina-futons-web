// cfw-yp4: structural invariants for src/app/robots.ts. The robots.txt
// route. cfw-7ke pinned that /admin and /api/admin must be disallowed
// — a regression that drops either entry exposes the owner-mode
// surface to search-index enumeration AND defeats the SSR-cost-saving
// short-circuit (well-behaved bots check robots.txt before fetching).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import robots from "@/app/robots";

const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://carolinafutons.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (ORIGINAL_NEXT_PUBLIC_SITE_URL !== undefined) {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_NEXT_PUBLIC_SITE_URL;
  }
});

describe("robots.ts", () => {
  it("returns rules with userAgent='*'", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0]?.userAgent).toBe("*");
  });

  it("allows '/' on the public surface (CF wants discoverability)", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const allow = rules[0]?.allow;
    if (Array.isArray(allow)) {
      expect(allow).toContain("/");
    } else {
      expect(allow).toBe("/");
    }
  });

  it("disallows BOTH '/admin' AND '/api/admin' (cfw-7ke owner-mode lockdown)", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const disallow = rules[0]?.disallow;
    const list = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    expect(list).toContain("/admin");
    expect(list).toContain("/api/admin");
  });

  it("emits a sitemap pointing at <base>/sitemap.xml", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://carolinafutons.com/sitemap.xml");
  });

  it("uses resolveSiteBase output — env change flows through to sitemap URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com/");
    const r = robots();
    // Trailing slash on env value is stripped by resolveSiteBase before
    // appending /sitemap.xml.
    expect(r.sitemap).toBe("https://staging.example.com/sitemap.xml");
  });
});

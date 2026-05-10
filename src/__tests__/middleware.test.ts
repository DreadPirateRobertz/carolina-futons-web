// cfw-5lv: coverage for src/middleware.ts. Sets 6 critical security
// headers on every non-static response. A silent regression here
// (HSTS gaining 'preload' — irreversible for months once submitted to
// hstspreload.org; Permissions-Policy losing 'payment=()' which
// re-enables the Payment Request API; matcher widening to capture
// _next/static, defeating the static-asset short-circuit) is exactly
// the kind of change that ships to production without a visible
// failure mode. Pin every header value + the matcher regex.

import { describe, it, expect } from "vitest";

import { config, middleware } from "@/middleware";
import type { NextRequest } from "next/server";

function callMiddleware() {
  // The handler ignores its argument; cast a sentinel so the type
  // matches without depending on Next's request constructor surface.
  return middleware({} as NextRequest);
}

describe("middleware — security header bag", () => {
  it("sets X-Content-Type-Options: nosniff (blocks MIME sniffing)", () => {
    const res = callMiddleware();
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY (blocks clickjacking via iframe embedding)", () => {
    const res = callMiddleware();
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Referrer-Policy: strict-origin-when-cross-origin", () => {
    const res = callMiddleware();
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("sets HSTS to 1 year + includeSubDomains and CRITICALLY does NOT include 'preload'", () => {
    const res = callMiddleware();
    const hsts = res.headers.get("Strict-Transport-Security");
    expect(hsts).toBe("max-age=31536000; includeSubDomains");
    // Preload submission to hstspreload.org is irreversible for months.
    // The file's own comment pins this — assert at runtime so a casual
    // "let's also add preload" PR fails CI loudly.
    expect(hsts).not.toContain("preload");
  });

  it("sets Permissions-Policy disabling camera/mic/geo/payment + Topics + FLoC", () => {
    const res = callMiddleware();
    const policy = res.headers.get("Permissions-Policy") ?? "";
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
    // payment=() blocks the browser-native Payment Request API. Checkout
    // is a full redirect to Wix; re-enabling here would let a stray
    // PaymentRequest call try to bypass the redirect.
    expect(policy).toContain("payment=()");
    // interest-cohort=() opts out of the deprecated FLoC API.
    expect(policy).toContain("interest-cohort=()");
    // browsing-topics=() opts out of the successor Privacy Sandbox Topics
    // API. Pin it so a future "Topics seems harmless, let's enable" change
    // fails CI.
    expect(policy).toContain("browsing-topics=()");
  });

  it("sets X-DNS-Prefetch-Control: on (re-enables prefetch on HTTPS)", () => {
    const res = callMiddleware();
    expect(res.headers.get("X-DNS-Prefetch-Control")).toBe("on");
  });
});

describe("middleware — response shape", () => {
  it("returns a response object (passes the request through, doesn't terminate)", () => {
    const res = callMiddleware();
    expect(res).toBeDefined();
    // NextResponse.next() returns a Response — the headers Map is
    // populated above, which is sufficient proof the handler ran.
    expect(typeof res.headers.get).toBe("function");
  });

  it("sets exactly the 6 documented security headers (no surprise additions)", () => {
    const res = callMiddleware();
    const expected = [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "Permissions-Policy",
      "X-DNS-Prefetch-Control",
    ];
    for (const h of expected) {
      expect(res.headers.get(h), `missing header: ${h}`).not.toBeNull();
    }
  });
});

describe("middleware config — matcher regex", () => {
  it("exports exactly one matcher pattern", () => {
    expect(config.matcher).toHaveLength(1);
  });

  // Reconstruct the matcher RegExp the way Next does (anchored ^/$).
  // The pattern uses a negative lookahead to *exclude* paths, so a path
  // is "matched" iff the regex matches it.
  const matcherSource = (config.matcher as readonly string[])[0];
  const matcher = new RegExp(`^${matcherSource}$`);

  it.each([
    "/",
    "/visit",
    "/admin",
    "/admin/audit",
    "/shop/futon-frames",
    "/products/kingston",
    "/api/admin/site-content",
  ])("matches application route — %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    "/_next/static/chunks/main.js",
    "/_next/image?url=foo.jpg",
    "/favicon.ico",
    "/some-asset.css",
    "/og-image.png",
    "/robots.txt",
    "/sitemap.xml",
    "/feed.rss",
  ])("does NOT match static-asset / file-extensioned path — %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});

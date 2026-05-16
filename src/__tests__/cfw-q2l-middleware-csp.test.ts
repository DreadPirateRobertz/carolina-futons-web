// cfw-q2l: middleware emits Content-Security-Policy-Report-Only with the
// drafted Phase 1 baseline.
//
// Assertions are STRUCTURAL — verify each directive is present + that
// 'unsafe-inline' is allow-listed on script-src per the dangerouslySetInnerHTML
// inventory (12 sites). Phase 3 will narrow this; the test pins the Phase 1
// baseline so a future PR that drops a critical source (e.g. Sentry CDN)
// in pursuit of tightening fails CI before merging.
//
// We don't enforce the exact byte string — only that each directive is
// present and certain hosts are allowed — so cosmetic reordering /
// whitespace-normalisation doesn't break the test.

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

function call(): Headers {
  const req = new NextRequest("https://carolinafutons.com/");
  const res = middleware(req);
  return res.headers;
}

describe("cfw-q2l middleware — CSP-Report-Only baseline", () => {
  it("sets Content-Security-Policy-Report-Only", () => {
    const csp = call().get("Content-Security-Policy-Report-Only");
    expect(csp).toBeTruthy();
    expect(typeof csp).toBe("string");
  });

  it("does NOT set the enforcing Content-Security-Policy header in Phase 1", () => {
    expect(call().get("Content-Security-Policy")).toBeNull();
  });

  it("includes default-src 'self' baseline", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/default-src 'self'/);
  });

  it("allows 'unsafe-inline' on script-src (12 analytics-bootstrap inline scripts)", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/script-src[^;]+ 'unsafe-inline'/);
  });

  it("allow-lists the four marketing pixel hosts on script-src", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://connect.facebook.net");
    expect(csp).toContain("https://analytics.tiktok.com");
    expect(csp).toContain("https://ct.pinterest.com");
  });

  it("allow-lists Cloudflare Turnstile on script-src + frame-src", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toMatch(/frame-src[^;]+ https:\/\/challenges\.cloudflare\.com/);
  });

  it("allow-lists Wix CDN hosts on img-src", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/img-src[^;]+ https:\/\/static\.wixstatic\.com/);
    expect(csp).toMatch(/img-src[^;]+ https:\/\/video\.wixstatic\.com/);
  });

  it("allow-lists Sentry ingest hosts on connect-src", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/connect-src[^;]+ https:\/\/\*\.sentry\.io/);
    expect(csp).toMatch(/connect-src[^;]+ https:\/\/\*\.ingest\.sentry\.io/);
  });

  it("locks down object-src and frame-ancestors", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
  });

  it("declares report-uri pointing at /api/csp-report", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/report-uri \/api\/csp-report/);
  });

  it("includes upgrade-insecure-requests", () => {
    const csp = call().get("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toMatch(/upgrade-insecure-requests/);
  });

  it("preserves the existing security-header baseline", () => {
    const h = call();
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(h.get("X-DNS-Prefetch-Control")).toBe("on");
  });
});

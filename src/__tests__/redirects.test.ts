import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config redirects (cf-tjh)", () => {
  it("maps all legacy nav paths to /shop/<slug> with permanent: true", async () => {
    const redirects = await nextConfig.redirects!();
    const bySource = Object.fromEntries(redirects.map((r) => [r.source, r]));

    const expected = [
      ["/futons", "/shop/futon-frames"],
      ["/murphy-beds", "/shop/murphy-cabinet-beds"],
      ["/mattresses", "/shop/mattresses"],
      ["/frames", "/shop/platform-beds"],
      ["/sale", "/shop/mattresses-sale"],
    ] as const;

    expected.forEach(([source, destination]) => {
      expect(bySource[source], `redirect for ${source}`).toBeDefined();
      expect(bySource[source].destination).toBe(destination);
      expect(bySource[source].permanent).toBe(true);
    });
  });
});

describe("next.config redirects (cf-3qt.7.1) — Wix Studio → cfw", () => {
  it("redirects every Wix-era canonical path with permanent: true (308)", async () => {
    const redirects = await nextConfig.redirects!();
    const bySource = Object.fromEntries(redirects.map((r) => [r.source, r]));

    const expected = [
      ["/home", "/"],
      // Wix Stores dynamic patterns.
      ["/product-page/:slug", "/products/:slug"],
      ["/product-page", "/shop"],
      ["/category-page/:slug", "/shop/:slug"],
      ["/category-page", "/shop"],
      // Wix Blog dynamic patterns.
      ["/post/:slug", "/blog/:slug"],
      ["/post", "/blog"],
      // Policy aliases.
      ["/shipping-policy", "/shipping"],
      ["/privacy-policy", "/privacy"],
      ["/refund-policy", "/returns"],
      ["/terms-and-conditions", "/terms"],
      ["/accessibility-statement", "/accessibility"],
      // Member surfaces.
      ["/members-area", "/account"],
      ["/members", "/account"],
      ["/paywall", "/account"],
      ["/plans-pricing", "/account"],
      // Order confirmation.
      ["/thank-you", "/order-confirmation"],
      ["/thank-you-page", "/order-confirmation"],
      // Booking surfaces.
      ["/book-online", "/contact"],
      ["/booking-form", "/contact"],
      // White-glove.
      ["/white-glove-delivery", "/shipping"],
      // Slug reconciliation.
      ["/room-planner", "/design-a-room"],
    ] as const;

    expected.forEach(([source, destination]) => {
      expect(bySource[source], `redirect for ${source}`).toBeDefined();
      expect(bySource[source].destination).toBe(destination);
      expect(bySource[source].permanent).toBe(true);
    });
  });

  it("does not double-map a source path (no overlapping redirects)", async () => {
    const redirects = await nextConfig.redirects!();
    const sources = redirects.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe("next.config redirects (cf-992s) — product slug corrections", () => {
  it("redirects wilderness-log-futon-frame to the correct slug", async () => {
    const redirects = await nextConfig.redirects!();
    const r = redirects.find((x) => x.source === "/products/wilderness-log-futon-frame");
    expect(r).toBeDefined();
    expect(r!.destination).toBe("/products/wilderness-log-futon");
    expect(r!.permanent).toBe(true);
  });
});

describe("next.config redirects (cf-3qt.8.6) — pre-cutover redirect map gaps", () => {
  it("maps all 6 gap entries to correct destinations with permanent: true", async () => {
    const redirects = await nextConfig.redirects!();
    const bySource = Object.fromEntries(redirects.map((r) => [r.source, r]));

    const expected = [
      ["/cart-page", "/cart"],
      ["/product/:slug", "/products/:slug"],
      ["/store", "/shop"],
      ["/store/product/:slug", "/products/:slug"],
      ["/store/category/:slug", "/shop/:slug"],
      ["/blank-1", "/style-quiz"],
    ] as const;

    expected.forEach(([source, destination]) => {
      expect(bySource[source], `redirect for ${source}`).toBeDefined();
      expect(bySource[source].destination, `destination for ${source}`).toBe(destination);
      expect(bySource[source].permanent, `permanent for ${source}`).toBe(true);
    });
  });

  it("no redirect loops — no source equals its own destination", async () => {
    const redirects = await nextConfig.redirects!();
    redirects.forEach(({ source, destination }) => {
      expect(
        source,
        `redirect loop detected: ${source} → ${destination}`,
      ).not.toBe(destination);
    });
  });

  it("unknown source path is not in the redirect map", async () => {
    const redirects = await nextConfig.redirects!();
    const sources = new Set(redirects.map((r) => r.source));
    const unknowns = [
      "/nonexistent-wix-page",
      "/old-page-that-was-never-a-route",
      "/store/checkout",
    ];
    unknowns.forEach((path) => {
      expect(sources.has(path), `${path} should not be in redirect map`).toBe(false);
    });
  });

  it("all redirect map entries use permanent: true (308, not 302)", async () => {
    const redirects = await nextConfig.redirects!();
    redirects.forEach(({ source, permanent }) => {
      expect(permanent, `${source} should be permanent`).toBe(true);
    });
  });
});

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

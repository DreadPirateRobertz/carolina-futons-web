import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // cf-93rb Phase A: the brand illustrations under /public/illustrations
    // are vetted, inert SVGs (no <script>/on*=/javascript: URIs). Enabling
    // dangerouslyAllowSVG is required for next/image to serve any local
    // SVG; the CSP forbids script execution and sandboxes the response so
    // even a future SVG slipped past review can't run code from our origin.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/media/**",
      },
    ],
  },
  async redirects() {
    return [
      // Legacy nav shortcuts (cf-tjh) — pre-migration permalinks.
      { source: "/futons", destination: "/shop/futon-frames", permanent: true },
      {
        source: "/murphy-beds",
        destination: "/shop/murphy-cabinet-beds",
        permanent: true,
      },
      {
        source: "/mattresses",
        destination: "/shop/mattresses",
        permanent: true,
      },
      { source: "/frames", destination: "/shop/platform-beds", permanent: true },
      { source: "/sale", destination: "/shop/mattresses-sale", permanent: true },

      // cf-3qt.7.1 — Wix Studio canonical paths → cfw equivalents.
      // Sourced from EDITOR-HOOKUP-GUIDE.md page table + URL-CMS-MAP.md.
      // permanent: true emits HTTP 308 (path + method preserved).
      // Routes still on the migration backlog (/faq, /getting-it-home,
      // /search, /cart, /checkout) keep their Wix path as the cfw canonical
      // — no redirect needed; they resolve once those pages ship.
      { source: "/home", destination: "/", permanent: true },

      // Wix Stores dynamic routes.
      {
        source: "/product-page/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      { source: "/product-page", destination: "/shop", permanent: true },
      {
        source: "/category-page/:slug",
        destination: "/shop/:slug",
        permanent: true,
      },
      { source: "/category-page", destination: "/shop", permanent: true },

      // Wix Blog dynamic routes.
      { source: "/post/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/post", destination: "/blog", permanent: true },

      // Policy pages.
      {
        source: "/shipping-policy",
        destination: "/shipping",
        permanent: true,
      },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/refund-policy", destination: "/returns", permanent: true },
      {
        source: "/terms-and-conditions",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/accessibility-statement",
        destination: "/accessibility",
        permanent: true,
      },

      // Member surfaces collapse onto /account until cf-3qt.3 lands the full
      // dashboard split.
      { source: "/members-area", destination: "/account", permanent: true },
      { source: "/members", destination: "/account", permanent: true },
      { source: "/paywall", destination: "/account", permanent: true },
      { source: "/plans-pricing", destination: "/account", permanent: true },

      // Order confirmation aliases.
      {
        source: "/thank-you",
        destination: "/order-confirmation",
        permanent: true,
      },
      {
        source: "/thank-you-page",
        destination: "/order-confirmation",
        permanent: true,
      },

      // Booking / consultation surfaces collapse onto /contact (booking is
      // post-migration optimization per URL-CMS-MAP §5).
      { source: "/book-online", destination: "/contact", permanent: true },
      { source: "/booking-form", destination: "/contact", permanent: true },

      // White-glove delivery info merged into /shipping.
      {
        source: "/white-glove-delivery",
        destination: "/shipping",
        permanent: true,
      },

      // Slug reconciliation — hookup guide used /room-planner; cfw ships /design-a-room.
      { source: "/room-planner", destination: "/design-a-room", permanent: true },

      // cf-1te7 — Wix Studio /collections/* → cfw /shop/*
      { source: "/collections/:slug", destination: "/shop/:slug", permanent: true },
      { source: "/collections", destination: "/shop", permanent: true },

      // cf-e92v — /care + /care-warranty collapse onto /warranty
      { source: "/care", destination: "/warranty", permanent: true },
      { source: "/care-warranty", destination: "/warranty", permanent: true },

      // cf-992s — product slug corrections (Wix CMS slug mismatch → 404)
      { source: "/products/wilderness-log-futon-frame", destination: "/products/wilderness-log-futon", permanent: true },
    ];
  },
};

export default nextConfig;

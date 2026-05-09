import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // cf-r192: keep the Wix SDK + auto_sdk_* sub-packages in the Node server
  // runtime only. Without this, Turbopack lifts wix-client.ts into a client
  // async chunk via the server-action call graph (server-action stubs imported
  // by "use client" components → Turbopack walks the action's transitive deps).
  // The resulting chunk shipped 9 sub-packages of admin-shaped Wix SDK code on
  // every PDP load (~117 KiB transferred / 905 KB raw post-cf-g6vx). These
  // packages have no business in the browser — every Wix call from cfw goes
  // through a Server Action or server-only module.
  serverExternalPackages: [
    "@wix/sdk",
    "@wix/sdk-runtime",
    "@wix/sdk-types",
    "@wix/wix-data-items-sdk",
    "@wix/auto_sdk_stores_products",
    "@wix/auto_sdk_stores_collections",
    "@wix/auto_sdk_members_members",
    "@wix/auto_sdk_ecom_current-cart",
    "@wix/auto_sdk_ecom_checkout",
    "@wix/auto_sdk_ecom_orders",
    "@wix/auto_sdk_redirects_redirects",
    "@wix/auto_sdk_blog_posts",
    "@wix/auto_sdk_identity_recovery",
  ],
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

      // cf-3qt.8.6 — pre-cutover redirect map gaps.

      // Wix Stores Cart Page slug → cfw /cart.
      { source: "/cart-page", destination: "/cart", permanent: true },

      // Wix Stores also exposes /product/:slug (singular, no "page" suffix) in
      // its sitemap alongside /product-page/:slug. Both must reach cfw /products/.
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },

      // Wix Stores Classic (pre-Studio) served the store at /store and PDPs at
      // /store/product/:slug. Covers old backlinks and Google-indexed paths.
      { source: "/store", destination: "/shop", permanent: true },
      { source: "/store/product/:slug", destination: "/products/:slug", permanent: true },
      { source: "/store/category/:slug", destination: "/shop/:slug", permanent: true },

      // Style Quiz Wix page used "blank" page template with slug /blank-1.
      { source: "/blank-1", destination: "/style-quiz", permanent: true },
    ];
  },
};

export default nextConfig;

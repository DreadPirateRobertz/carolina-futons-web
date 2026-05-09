import type { MetadataRoute } from "next";

import { resolveSiteBase } from "./sitemap";

// /robots.txt — allow all crawlers on the public surface, disallow the
// /admin and /api/admin owner-mode paths. The allow-all posture is
// intentional for the public surface: CF wants discoverability for every
// shoppable route, and staging/preview environments are protected by
// Vercel's deploy password rather than robots.txt (a robots disallow is
// advisory, not enforceable).
//
// cfw-7ke: explicit disallow on the owner-mode paths. Each /admin/* page
// already sets per-page robots:{index:false,follow:false} via the route
// group's metadata, but well-behaved crawlers honour robots.txt before
// fetching the page — which saves the SSR cost of getOwnerSession (and
// the redirect) on every bot hit, and nudges hostile crawlers toward not
// enumerating the admin surface area.
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteBase();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

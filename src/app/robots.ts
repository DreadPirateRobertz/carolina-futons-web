import type { MetadataRoute } from "next";

import { resolveSiteBase } from "./sitemap";

// /robots.txt — allow all crawlers and point at the sitemap. The allow-all
// posture is intentional: CF wants discoverability for every public route,
// and staging/preview environments are protected by Vercel's deploy password
// rather than robots.txt (a robots disallow is advisory, not enforceable).
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteBase();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}

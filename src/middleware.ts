import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  // Prevent MIME-type sniffing.
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Block clickjacking — no iframing from any origin.
  res.headers.set("X-Frame-Options", "DENY");
  // Limit referrer to origin on cross-origin requests.
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Force HTTPS for 1 year, include subdomains.
  // Intentionally omits `preload` until DNS cutover is confirmed complete and
  // all subdomains are HTTPS-clean — preload registration is irreversible for
  // months once submitted to hstspreload.org.
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  // Restrict unused browser features. `payment=()` disables the Payment
  // Request API — checkout is a full redirect to Wix, not a browser-native
  // payment sheet. `browsing-topics=()` opts out of the Privacy Sandbox Topics
  // API (successor to the now-deprecated FLoC / `interest-cohort`).
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=(), browsing-topics=()",
  );
  // Re-enable DNS prefetching for links on the page (browsers suppress it by
  // default on HTTPS; explicit `on` restores the performance benefit).
  res.headers.set("X-DNS-Prefetch-Control", "on");
  // cfw-q2l Phase 1 — report-only Content-Security-Policy. Browsers
  // evaluate the policy but do NOT block; violations are POSTed to the
  // report-uri so we can enumerate every script/style/img/connect source
  // the site actually uses before flipping to enforce in Phase 2.
  //
  // WHY 'unsafe-inline' on script-src: 12 sites use dangerouslySetInnerHTML
  // for analytics bootstraps (GA4, Meta fbq, TikTok ttq, Pinterest pintrk,
  // ConsentMode). Phase 3 will replace with nonce-based once middleware
  // generates a per-request nonce and the App Router shell injects it.
  // 'unsafe-eval' is allowed because @wix/sdk uses Function() in some
  // runtime code paths — Phase 2 will narrow this once the violation log
  // confirms which surfaces actually need it.
  //
  // report-uri points at our own /api/csp-report stub which logs to
  // stdout (Vercel log retention). Sentry CSP-endpoint wiring is a
  // follow-up — keeping the destination same-origin means no CORS
  // permissions to negotiate and no external dep on a Sentry config.
  res.headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.facebook.com https://analytics.tiktok.com https://*.tiktokcdn.com https://ct.pinterest.com https://*.pinimg.com https://challenges.cloudflare.com https://*.sentry-cdn.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://static.wixstatic.com https://video.wixstatic.com https://www.facebook.com https://ct.pinterest.com https://www.google-analytics.com https://stats.g.doubleclick.net",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://connect.facebook.net https://www.facebook.com https://analytics.tiktok.com https://ct.pinterest.com https://users.wix.com https://*.wixstatic.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
      "frame-src 'self' https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://users.wix.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report",
    ].join("; "),
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};

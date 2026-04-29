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
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};

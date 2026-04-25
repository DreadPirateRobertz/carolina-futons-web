"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// cf-3qt.7.4: TikTok Pixel — Pageview only (per bead AC).
//
// Reads the pixel ID from NEXT_PUBLIC_TIKTOK_PIXEL_ID at render time. If the
// env var is unset (preview deploys without analytics, local dev), the
// component returns null and emits no script tag — matches the
// short-circuit pattern used by the Wix-side public/tikTokPixel.js so a
// missing/placeholder ID never produces a broken script request.
//
// The snippet itself fires PageView on initial mount. App Router does not
// re-mount layout on client-side navigation, so we also fire ttq.page() in
// a usePathname effect so SPA-style nav still produces a pageview hit.

// TikTok pixel IDs are alphanumeric (commonly 20 chars). The strict regex
// here is a defense-in-depth check before interpolating the value into a
// dangerouslySetInnerHTML payload — even though NEXT_PUBLIC_* vars are
// developer-controlled at build time, validating means a typo can never
// produce a script-injection vector.
const PIXEL_ID_PATTERN = /^[A-Za-z0-9]{1,40}$/;
const RAW_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const PIXEL_ID =
  RAW_PIXEL_ID && PIXEL_ID_PATTERN.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : null;

function PixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ttq = (window as unknown as { ttq?: { page?: () => void } }).ttq;
    ttq?.page?.();
    // Including searchParams in the dep so a query-string-only change
    // (sort, filter, paginated PLP) still records a pageview — matches the
    // behavior the Wix Studio site has via Velo's wixLocation onChange.
  }, [pathname, searchParams]);
  return null;
}

export function TikTokPixel() {
  if (!PIXEL_ID) return null;

  // The snippet is the official TikTok Pixel loader, lifted verbatim from
  // the Wix-side public/tikTokPixel.js so the same install fires identical
  // events. The opaque IIFE installs window.ttq and triggers the initial
  // page view via ttq.page(). PIXEL_ID is regex-validated above.
  const snippet = `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e+"-"+n]=+new Date;(function(t,a){var s=d.createElement(t);s.src=i+"?sdkid="+e+"&lib="+t;s.async=!0;var r=d.getElementsByTagName(t)[0];r.parentNode.insertBefore(s,r)})(t,e)};
  ttq.load('${PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');`;

  return (
    <>
      <Script
        id="cf-tiktok-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: snippet }}
      />
      {/* useSearchParams() suspends in App Router — wrap so the layout does
          not bail to client-side rendering for the whole tree. */}
      <Suspense fallback={null}>
        <PixelRouteTracker />
      </Suspense>
    </>
  );
}

"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// cf-3qt.7.3: Meta (Facebook) Pixel — Pageview baseline + helpers for
// AddToCart and Purchase. Per bead AC, all three event types must fire.
//
// Reads the pixel ID from NEXT_PUBLIC_META_PIXEL_ID at render time. If
// unset, returns null and emits no script tag — same short-circuit
// pattern as TikTokPixel/PinterestTag so preview deploys without
// analytics envs don't issue broken script requests.
//
// AddToCart and Purchase events are fired from MetaAddToCartTracker /
// MetaPurchaseTracker (sibling files) which call fireMetaEvent at the
// right lifecycle moment. They no-op if window.fbq is unavailable, so a
// missing pixel ID never breaks the cart or order-confirmation flow.

// Meta pixel IDs are numeric strings (typically 15–16 digits). Strict
// regex defends against script-injection if anyone misconfigures the env
// before a deploy.
const PIXEL_ID_PATTERN = /^[0-9]{1,20}$/;
const RAW_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const PIXEL_ID =
  RAW_PIXEL_ID && PIXEL_ID_PATTERN.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : null;

type FbqFn = ((event: "init", id: string) => void) &
  ((event: "track", name: string, params?: Record<string, unknown>) => void);

// Sibling trackers call this. No-op if the pixel never loaded (env unset
// or blocked) — keeps the cart action and order page from coupling their
// success to a third-party tag.
export function fireMetaEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
  fbq?.("track", name, params);
}

function PixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
    fbq?.("track", "PageView");
  }, [pathname, searchParams]);
  return null;
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;

  // The snippet is the official Meta Pixel base code. The IIFE installs
  // window.fbq and the subsequent fbq('init', ...) + fbq('track',
  // 'PageView') trigger the initial pageview. PIXEL_ID is regex-validated
  // above, so the interpolation is safe.
  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`;

  return (
    <>
      <Script
        id="cf-meta-pixel"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: snippet }}
      />
      {/* Static <noscript> img matches Meta's recommended fallback so
          users who block JS still register a pageview hit. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
      {/* useSearchParams() suspends in App Router — wrap so the layout does
          not bail to client-side rendering for the whole tree. */}
      <Suspense fallback={null}>
        <PixelRouteTracker />
      </Suspense>
    </>
  );
}

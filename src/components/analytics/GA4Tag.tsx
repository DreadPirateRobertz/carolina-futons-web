"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// cf-3qt.7.2: GA4 — pageview + ecommerce event surface.
//
// Reads the measurement ID from NEXT_PUBLIC_GA4_MEASUREMENT_ID at render
// time. If unset (preview deploys without analytics, local dev), the
// component returns null and emits no script tag — same short-circuit
// pattern as PinterestTag / TikTokPixel.
//
// MEASUREMENT_ID is regex-validated against /^G-[A-Z0-9]{6,12}$/ before
// any interpolation into the inline gtag bootstrap snippet. The pattern
// rejects any character that could escape a string literal, so the inline
// script is safe even though it uses dangerouslySetInnerHTML — same
// defense-in-depth pattern as PinterestTag / TikTokPixel.
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;
const RAW_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const MEASUREMENT_ID =
  RAW_MEASUREMENT_ID && MEASUREMENT_ID_PATTERN.test(RAW_MEASUREMENT_ID)
    ? RAW_MEASUREMENT_ID
    : null;

type GtagFn = (
  command: "event" | "config" | "set",
  eventOrTarget: string,
  params?: Record<string, unknown>,
) => void;

function PageRouteTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (!gtag) return;
    const search = searchParams?.toString();
    const page_path = search ? `${pathname}?${search}` : pathname;
    gtag("event", "page_view", {
      send_to: measurementId,
      page_path,
    });
  }, [pathname, searchParams, measurementId]);
  return null;
}

export function GA4Tag() {
  if (!MEASUREMENT_ID) return null;

  const snippet =
    "window.dataLayer = window.dataLayer || [];\n" +
    "function gtag(){dataLayer.push(arguments);}\n" +
    "gtag('js', new Date());\n" +
    `gtag('config', '${MEASUREMENT_ID}');`;

  return (
    <>
      <Script
        id="cf-ga4-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      />
      <Script
        id="cf-ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: snippet }}
      />
      <Suspense fallback={null}>
        <PageRouteTracker measurementId={MEASUREMENT_ID} />
      </Suspense>
    </>
  );
}

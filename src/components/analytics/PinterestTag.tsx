"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// cf-3qt.7.5: Pinterest Tag — Pageview only (per bead AC).
//
// Reads the tag ID from NEXT_PUBLIC_PINTEREST_TAG_ID at render time. If
// the env var is unset (preview deploys without analytics, local dev),
// the component returns null and emits no script tag — matches the
// short-circuit pattern used by the Wix-side public/pinterestTag.js so a
// missing/placeholder ID never produces a broken script request.
//
// The snippet itself fires `pintrk('page')` on initial mount. App Router
// does not re-mount the layout on client-side navigation, so we also
// fire window.pintrk('page') in a usePathname effect so SPA-style nav
// still produces a pageview hit.

// Pinterest Tag IDs are numeric strings (typically 13 digits). The strict
// regex here is a defense-in-depth check before interpolating the value
// into a dangerouslySetInnerHTML payload — even though NEXT_PUBLIC_*
// vars are developer-controlled at build time, validating means a typo
// can never produce a script-injection vector.
const TAG_ID_PATTERN = /^[0-9]{1,20}$/;
const RAW_TAG_ID = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID;
const TAG_ID =
  RAW_TAG_ID && TAG_ID_PATTERN.test(RAW_TAG_ID) ? RAW_TAG_ID : null;

function PixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pintrk = (window as unknown as { pintrk?: (event: string) => void })
      .pintrk;
    pintrk?.("page");
  }, [pathname, searchParams]);
  return null;
}

export function PinterestTag() {
  if (!TAG_ID) return null;

  // The snippet is the official Pinterest core.js loader, lifted verbatim
  // from the Wix-side public/pinterestTag.js so the same install fires
  // identical events. The IIFE installs window.pintrk and the subsequent
  // pintrk('load', ...) + pintrk('page') trigger the initial pageview.
  // TAG_ID is regex-validated above.
  const snippet = `!function (e) {
  if (!window.pintrk) {
    window.pintrk = function () {
      window.pintrk.queue.push(Array.prototype.slice.call(arguments));
    };
    var n = window.pintrk;
    n.queue = []; n.version = '3.0';
    var t = document.createElement('script');
    t.async = true; t.src = e;
    var r = document.getElementsByTagName('script')[0];
    r.parentNode.insertBefore(t, r);
  }
}('https://s.pinimg.com/ct/core.js');
window.pintrk('load', '${TAG_ID}', { np: 'next' });
window.pintrk('page');`;

  return (
    <>
      <Script
        id="cf-pinterest-tag"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: snippet }}
      />
      {/* Static <noscript> img matches Pinterest's recommended fallback so
          users who block JS still register a pageview hit. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://ct.pinterest.com/v3/?event=init&tid=${TAG_ID}&noscript=1`}
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

"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
} from "framer-motion";
import { PdpImageLightbox } from "./PdpImageLightbox";

// cf-3qt.6.F.1 + cf-3qt.7.O.1: multi-image gallery for the PDP.
//
// - `activeUrl` lets the variant picker drive the main image (variant-with-
//   mainMedia wins over the user's thumb selection so swatch + main agree).
// - The main image gets a subtle scroll-driven zoom (1.00 → 1.05 over its
//   viewport pass). Honors prefers-reduced-motion (flat scale).
// - Thumbnail swap uses the View Transitions API (Chromium 111+, Firefox 126+,
//   Safari 18+) to morph from the clicked thumb into the main image. Browsers
//   without the API fall back to a framer opacity crossfade keyed on src.
//   prefers-reduced-motion = instant swap, no animation.
//   Firefox note: view-transition-name on dynamically-toggled inline styles
//   has an open spec question (https://github.com/w3c/csswg-drafts/issues/8319);
//   the fallback path handles any browser where startViewTransition is absent.

// Local shape — kept narrow (`finished` + `skipTransition` are the only
// members we touch). The lib.dom.d.ts ViewTransition type doesn't ship in
// every TS version we support, so this avoids the dependency.
type GalleryViewTransition = {
  readonly finished: Promise<unknown>;
  skipTransition: () => void;
};

type DocumentWithVT = Document & {
  startViewTransition?: (
    callback: () => void | Promise<void>,
  ) => GalleryViewTransition;
};

const VT_NAME = "pdp-gallery";

// 1×1 transparent PNG — safe fallback when a product image URL is broken.
// Prevents the "torn image" icon and keeps VT transitions completing cleanly.
const FALLBACK_PRODUCT_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export type GalleryImage = {
  url: string;
  alt?: string;
};

export type PdpGalleryProps = {
  images: ReadonlyArray<GalleryImage>;
  productName: string;
  activeUrl?: string;
};

// Detects document.startViewTransition synchronously on both server and client.
// Kept as a named hook rather than inlined because the three snapshot constants
// (subscribeNoop, getVTClientSnapshot, getVTServerSnapshot) must be module-stable
// — inlining would require either duplicating them or defining them outside the
// component anyway, with no net reduction in lines.
const subscribeNoop = () => () => {};
const getVTClientSnapshot = () =>
  typeof (document as DocumentWithVT).startViewTransition === "function";
const getVTServerSnapshot = () => false;

function useSupportsViewTransition() {
  // useSyncExternalStore's getServerSnapshot arg makes the SSR/client
  // divergence safe: server always returns false, client corrects on hydration
  // without the mismatch warning useState+useEffect would produce.
  return useSyncExternalStore(
    subscribeNoop,
    getVTClientSnapshot,
    getVTServerSnapshot,
  );
}

export function PdpGallery({ images, productName, activeUrl }: PdpGalleryProps) {
  // Initialize from activeUrl so the default variant's image is shown first.
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (!activeUrl) return 0;
    const i = images.findIndex((img) => img.url === activeUrl);
    return i >= 0 ? i : 0;
  });
  // Sync selectedIndex when the variant picker changes activeUrl (new variant
  // selected). Between variant changes, user thumb-clicks win freely.
  // "Adjust state during render" pattern — avoids a double-render via useEffect.
  const [prevActiveUrl, setPrevActiveUrl] = useState(activeUrl);
  if (activeUrl !== prevActiveUrl) {
    setPrevActiveUrl(activeUrl);
    const newIdx = activeUrl ? images.findIndex((img) => img.url === activeUrl) : -1;
    if (newIdx >= 0) setSelectedIndex(newIdx);
  }
  // When non-null, the thumb at this index temporarily carries the
  // view-transition-name as the BEFORE-snapshot source. Main yields its
  // name during this window so the snapshot has no duplicate-name conflict.
  const [vtSourceIndex, setVtSourceIndex] = useState<number | null>(null);
  const activeTransition = useRef<GalleryViewTransition | null>(null);
  // Tracks URLs that failed to load. State (not DOM mutation) so React renders
  // FALLBACK_PRODUCT_IMG via the src prop and reconciliation never reverts it.
  const [brokenSrcs, setBrokenSrcs] = useState<ReadonlySet<string>>(new Set());
  const [zoomOpen, setZoomOpen] = useState(false);

  const reduce = useReducedMotion();
  const supportsVT = useSupportsViewTransition();

  function markBroken(url: string, context: string) {
    if (brokenSrcs.has(url)) {
      // Already marked — means the fallback data URI itself also errored
      // (e.g. CSP policy blocking data: scheme). Surface it at error level.
      console.error(`[PdpGallery] fallback also failed for broken src (${context}):`, url);
      return;
    }
    console.warn(`[PdpGallery] broken image src (${context}):`, url);
    setBrokenSrcs((prev) => new Set(prev).add(url));
  }

  function resolvedSrc(url: string): string {
    return brokenSrcs.has(url) ? FALLBACK_PRODUCT_IMG : url;
  }

  if (images.length === 0) {
    return (
      <div
        data-testid="pdp-gallery-empty"
        className="aspect-square w-full rounded-lg bg-cf-sand"
      />
    );
  }

  const index = Math.min(selectedIndex, images.length - 1);
  const active = images[index];

  const swap = (next: number) => {
    if (next === index) return;
    if (!supportsVT || reduce) {
      // Reduced-motion or unsupported browser: instant swap, no animation
      // beyond what the framer-crossfade path provides on key change.
      setSelectedIndex(next);
      return;
    }

    // Rapid-click cancellation: ViewTransition.skipTransition() jumps the
    // in-flight morph to its AFTER state instantly so the next transition
    // can start without queueing/lag.
    activeTransition.current?.skipTransition();

    // Phase 1 (synchronous): give the clicked thumb the view-transition-name
    // and pull it off main. Browser's BEFORE snapshot captures thumb-as-source.
    // NOTE: benchmark before removing this flushSync — the forced sync re-render
    // is necessary for the BEFORE snapshot to see the name on the thumb before
    // startViewTransition captures it. Removing it causes the name to be absent
    // in the BEFORE snapshot on slower devices, breaking the morph.
    flushSync(() => setVtSourceIndex(next));

    // Phase 2 (inside transition callback): swap selectedIndex and clear the
    // source. AFTER snapshot has main-as-target (with the new src) — browser
    // morphs from thumb position → main position.
    const t = (document as DocumentWithVT).startViewTransition!(() => {
      flushSync(() => {
        setSelectedIndex(next);
        setVtSourceIndex(null);
      });
    });
    activeTransition.current = t;
    // `.finished` rejects when the animation is cancelled (rapid click →
    // skipTransition) or when the browser aborts mid-morph. Swallowing the
    // rejection with a bare `.finally` would surface as an unhandled promise
    // rejection in devtools and Sentry. `.catch` logs a breadcrumb (console
    // only — the morph is UX polish, not a user-visible error), and the
    // chained `.finally` still runs so the ref cleanup is unconditional.
    void t.finished
      .catch((err: unknown) => {
        console.warn("[pdp-gallery] view-transition did not finish", err);
      })
      .finally(() => {
        if (activeTransition.current === t) activeTransition.current = null;
      });
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if (images.length <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      swap((index + 1) % images.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      swap((index - 1 + images.length) % images.length);
    }
  };

  // Framer crossfade is the fallback for browsers without the View Transitions
  // API. When VT is supported, the browser handles the morph natively — running
  // an additional framer crossfade on top would double-animate.
  const useFramerCrossfade = !supportsVT && !reduce;

  return (
    <div data-slot="pdp-gallery" className="space-y-3">
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label={`View ${productName} full size`}
        data-testid="pdp-main-image-zoom-trigger"
        className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
      >
        <ZoomMainImage
          src={resolvedSrc(active.url)}
          alt={active.alt ?? productName}
          crossfadeKey={index}
          carryVTName={vtSourceIndex === null}
          useFramerCrossfade={useFramerCrossfade}
          onImgError={() => markBroken(active.url, "main")}
        />
      </button>
      <PdpImageLightbox
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        src={resolvedSrc(active.url)}
        alt={active.alt ?? productName}
      />
      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${productName} image gallery`}
          onKeyDown={handleKey}
          className="flex gap-2 overflow-x-auto"
          tabIndex={0}
        >
          {images.map((img, i) => {
            const selected = i === index;
            const isVTSource = vtSourceIndex === i;
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Image ${i + 1} of ${images.length}${img.alt ? `: ${img.alt}` : ""}`}
                onClick={() => swap(i)}
                style={isVTSource ? { viewTransitionName: VT_NAME } : undefined}
                className={
                  "h-16 w-16 shrink-0 overflow-hidden rounded border transition " +
                  (selected
                    ? "border-cf-espresso ring-1 ring-cf-espresso"
                    : "border-cf-sand hover:border-cf-espresso/40")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedSrc(img.url)}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                  onError={() => markBroken(img.url, `thumb ${i}`)}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Subcomponent so the useScroll hook is only created when the gallery has at
// least one image — the empty-state early return above would otherwise hand
// useScroll an unhydrated ref and trigger a hydration error in tests.
function ZoomMainImage({
  src,
  alt,
  crossfadeKey,
  carryVTName,
  useFramerCrossfade,
  onImgError,
}: {
  src: string;
  alt: string;
  crossfadeKey: number;
  carryVTName: boolean;
  useFramerCrossfade: boolean;
  onImgError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  // Map scroll progress through the gallery to a tiny scale curve.
  // Range [start end → end start] = element entering bottom of viewport
  // through leaving the top. The 1.05 ceiling is deliberate — anything
  // larger compounds with Lenis's smoothed scroll velocity into perceptible
  // parallax, which is the vestibular trigger WCAG 2.3.3 (Animation from
  // Interactions, AAA) is designed to avoid.
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.05, 1]);

  // WCAG 2.3.3: when prefers-reduced-motion is set, omit the scale style
  // entirely (no MotionValue subscription, no transform) — not just scale=1
  // — so the image is byte-for-byte static.
  const baseStyle: MotionStyle = {
    ...(reduce ? {} : { scale }),
    ...(carryVTName ? { viewTransitionName: VT_NAME } : {}),
  };

  // Only attach motion props in the crossfade path. In the VT path the
  // browser handles the morph via view-transition-name, so we don't want
  // framer also animating opacity (would double up). Spreading conditionally
  // also keeps the DOM clean — no stray initial/animate attrs in the static
  // render path.
  const crossfadeProps = useFramerCrossfade
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.18 },
      }
    : {};

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg">
      <m.img
        // Keying on the logical index (not resolved src) forces a fresh mount
        // on thumb selection for the opacity fade, while keeping the element
        // stable on error-fallback swaps so the DOM ref stays valid.
        // In the VT path the browser handles the morph, no remount needed.
        key={useFramerCrossfade ? crossfadeKey : "static"}
        src={src}
        alt={alt}
        data-testid="pdp-main-image"
        style={baseStyle}
        onError={onImgError}
        {...crossfadeProps}
        className="aspect-square w-full object-cover"
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import {
  NOON_MINUTES,
  totalMinutesNow,
  computeLivingSky,
  type LivingSkyState,
} from "@/lib/illustrations/living-sky";
import {
  ABOUT_STAR_POSITIONS,
  SAFE_HEX_RE,
} from "@/lib/illustrations/about-illustrations-svg";

// cf-about-illus: Shared client component for about-page inline SVG scenes.
//
// Ported from cfutons/src/public/aboutIllustrations.js _applyAboutSkyState.
// Each scene gets a sky-tint <rect> overlay that shifts colour with the
// time-of-day engine (LivingSkyState.skyColors[0]).  At night (starOpacity > 0)
// a star field is injected above the scene.
//
// Tick interval and reduced-motion behaviour mirror LivingSkyClient (60s tick,
// NOON_MINUTES freeze). Overlay strategy differs: instead of mutating pre-existing
// element IDs, this component appends and removes #about-sky-overlay and
// #about-stars dynamically after mount.
//
// SSR: SVG renders with its static inner HTML — no overlay on the server.
// Mount: applyOverlay(now) immediately so the first visible frame matches
//        the wall clock.
// prefers-reduced-motion: applyOverlay once with NOON_MINUTES (a static
//   noon-sky tint rect is appended); no interval.
//
// Overlay elements are appended via DOM APIs so the dangerouslySetInnerHTML
// SVG body is never modified by React — the same __html string means React
// never resets innerHTML on re-render.

const TICK_INTERVAL_MS = 60_000;
const SVG_NS = "http://www.w3.org/2000/svg";

function createStarField(starOpacity: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("id", "about-stars");
  g.setAttribute("opacity", String(starOpacity));
  for (const [x, y] of ABOUT_STAR_POSITIONS) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", "1.2");
    circle.setAttribute("fill", "#FAF7F2");
    circle.setAttribute("opacity", "0.8");
    g.appendChild(circle);
  }
  return g;
}

function removeOverlay(root: SVGSVGElement): void {
  root.querySelector("#about-sky-overlay")?.remove();
  root.querySelector("#about-stars")?.remove();
}

function applyOverlay(root: SVGSVGElement, s: LivingSkyState): void {
  // Guard against racing with unmount — mutations on detached nodes are silent no-ops.
  if (!root.isConnected) return;

  const isNight = s.starOpacity > 0;
  // skyColors[0] is typed string; SAFE_HEX_RE rejects rgba() values that lerpColor
  // can produce for semi-transparent stops so they never reach setAttribute("fill").
  const safeColor = SAFE_HEX_RE.test(s.skyColors[0]) ? s.skyColors[0] : null;

  let tintRect = root.querySelector<SVGRectElement>("#about-sky-overlay");
  if (safeColor) {
    if (!tintRect) {
      tintRect = document.createElementNS(SVG_NS, "rect");
      tintRect.setAttribute("id", "about-sky-overlay");
      tintRect.setAttribute("width", "100%");
      tintRect.setAttribute("height", "100%");
      root.appendChild(tintRect);
    }
    tintRect.setAttribute("fill", safeColor);
    tintRect.setAttribute("opacity", String(isNight ? 0.55 : 0.25));
  } else {
    tintRect?.remove();
  }

  const starsG = root.querySelector<SVGGElement>("#about-stars");
  if (isNight) {
    if (!starsG) {
      root.appendChild(createStarField(s.starOpacity));
    } else {
      starsG.setAttribute("opacity", String(s.starOpacity));
    }
  } else {
    starsG?.remove();
  }
}

function prefersReducedMotion(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return true;
  }
}

export type AboutIllustrationClientProps = {
  svgBody: string;
  viewWidth: number;
  viewHeight: number;
  titleId?: string;
  className?: string;
};

export function AboutIllustrationClient({
  svgBody,
  viewWidth,
  viewHeight,
  titleId,
  className,
}: AboutIllustrationClientProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    if (reduced) {
      applyOverlay(root, computeLivingSky(NOON_MINUTES));
      return () => removeOverlay(root);
    }

    const tick = () => {
      try {
        applyOverlay(root, computeLivingSky(totalMinutesNow()));
      } catch (err) {
        console.error("[AboutIllustration] overlay tick failed:", err);
      }
    };
    tick();
    const id = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <svg
      ref={svgRef}
      data-slot="about-illustration"
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
      dangerouslySetInnerHTML={{ __html: svgBody }}
    />
  );
}

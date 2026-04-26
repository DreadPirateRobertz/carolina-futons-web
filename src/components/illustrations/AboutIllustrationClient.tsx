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
// a 10-point star field is injected above the scene.
//
// Lifecycle matches LivingSkyClient exactly:
//   SSR → SVG renders with static inner HTML (no overlay).
//   Mount → applyOverlay(now) immediately so the first visible frame matches
//           the wall clock.
//   60s tick → re-apply.
//   prefers-reduced-motion → freeze at NOON_MINUTES; no interval.
//
// Overlay elements are appended via DOM APIs after mount so the
// dangerouslySetInnerHTML SVG body is never modified by React — the same
// __html string means React never resets innerHTML on re-render.

const TICK_INTERVAL_MS = 60_000;

function applyOverlay(root: SVGSVGElement, s: LivingSkyState): void {
  const isNight = s.starOpacity > 0;
  const skyColor = s.skyColors[0];
  const safeColor = typeof skyColor === "string" && SAFE_HEX_RE.test(skyColor)
    ? skyColor
    : null;

  let tintRect = root.querySelector<SVGRectElement>("#about-sky-overlay");
  if (safeColor) {
    if (!tintRect) {
      tintRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
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

  let starsG = root.querySelector<SVGGElement>("#about-stars");
  if (isNight) {
    if (!starsG) {
      starsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      starsG.setAttribute("id", "about-stars");
      for (const [x, y] of ABOUT_STAR_POSITIONS) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", "1.2");
        circle.setAttribute("fill", "#FAF7F2");
        circle.setAttribute("opacity", "0.8");
        starsG.appendChild(circle);
      }
      root.appendChild(starsG);
    }
  } else {
    starsG?.remove();
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export type AboutIllustrationClientProps = {
  svgBody: string;
  viewWidth: number;
  viewHeight: number;
  className?: string;
};

export function AboutIllustrationClient({
  svgBody,
  viewWidth,
  viewHeight,
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
      return;
    }

    const tick = () => applyOverlay(root, computeLivingSky(totalMinutesNow()));
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
      className={[
        "pointer-events-none w-full select-none leading-none",
        className,
      ].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: svgBody }}
    />
  );
}

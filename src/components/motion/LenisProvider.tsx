"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Smooth-scroll provider. Initializes a single Lenis instance bound to
// `window` and drives it from a rAF loop until the component unmounts.
// Mounted once at the root layout — owns the page scroll and replaces
// native momentum on supporting browsers.
//
// Honors prefers-reduced-motion: if the user has reduced motion enabled,
// we skip Lenis entirely and let native scrolling run (Lenis interpolation
// is the motion this query is asking us to suppress).
export function LenisProvider() {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    const lenis = new Lenis();
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}

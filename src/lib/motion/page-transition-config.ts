import type { Easing } from "framer-motion";

export type PageTransitionVariants = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: { duration: number; ease: Easing };
};

const Y_OFFSET_PX = 8;
const DURATION_SEC = 0.2;
const REDUCED_DURATION_SEC = 0.1;
const EASE: Easing = "easeOut";

/**
 * Page-transition variants for the PLP → PDP (and any client route change)
 * cross-fade. Phase 7 motion budget:
 *   - `DURATION_SEC` fade + `Y_OFFSET_PX` y-offset
 *   - ease-out for perceived snappiness on enter
 *
 * Under OS-level reduced-motion, drop the y-offset entirely and shorten the
 * duration (users who opted out of motion still benefit from a tiny opacity
 * blink as a route-change cue — zero transition would make the content swap
 * feel abrupt).
 */
export function getPageTransitionVariants({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): PageTransitionVariants {
  const y = reducedMotion ? 0 : Y_OFFSET_PX;
  const duration = reducedMotion ? REDUCED_DURATION_SEC : DURATION_SEC;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    // Guard against JS's `-0` when y is 0 (reduced-motion path) — Object.is
    // distinguishes +0 / -0 and tooling/snapshots occasionally surface it.
    exit: { opacity: 0, y: y === 0 ? 0 : -y },
    transition: { duration, ease: EASE },
  };
}

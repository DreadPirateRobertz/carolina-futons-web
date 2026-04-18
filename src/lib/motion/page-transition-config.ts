import type { Easing } from "framer-motion";

export type PageTransitionVariants = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: { duration: number; ease: Easing };
};

const Y_OFFSET_PX = 8;

/**
 * Page-transition variants for the PLP → PDP (and any client route change)
 * cross-fade. Phase 7 motion budget:
 *   - 200ms fade + 8px y-offset
 *   - ease-out for perceived snappiness on enter
 *
 * Under OS-level reduced-motion, drop the y-offset entirely and shorten the
 * duration to a near-instant cross-fade (users who opted out of motion still
 * benefit from a tiny opacity blink as a route-change cue — zero transition
 * would make the content swap feel abrupt).
 */
export function getPageTransitionVariants({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): PageTransitionVariants {
  if (reducedMotion) {
    return {
      initial: { opacity: 0, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 0 },
      transition: { duration: 0.1, ease: "easeOut" },
    };
  }
  return {
    initial: { opacity: 0, y: Y_OFFSET_PX },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -Y_OFFSET_PX },
    transition: { duration: 0.2, ease: "easeOut" },
  };
}

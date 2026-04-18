"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { getPageTransitionVariants } from "@/lib/motion/page-transition-config";

// `m.*` (not `motion.*`) keeps the LazyMotion/domAnimation bundle benefit
// from MotionProvider in app/layout.tsx. AnimatePresence mode="wait" ensures
// the exiting page finishes its configured fade before the new page enters,
// so we don't double-stack content during navigation.
export function PageTransition({ children }: { children: ReactNode }) {
  // usePathname() can momentarily be null during SSR or in error boundaries
  // — coerce to an empty string so AnimatePresence sees a stable key on the
  // first render rather than treating `null` as a distinct route.
  const pathname = usePathname() ?? "";
  const prefersReducedMotion = useReducedMotion() ?? false;
  const variants = getPageTransitionVariants({
    reducedMotion: prefersReducedMotion,
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pathname}
        data-slot="page-transition"
        data-pathname={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={variants.transition}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

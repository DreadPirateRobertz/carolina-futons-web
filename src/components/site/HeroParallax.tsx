"use client";

import { useRef } from "react";
import { m, useScroll, useTransform, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
};

export function HeroParallax({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // ?? false: useReducedMotion returns null on SSR; treat null as non-reduced
  // so the server render matches the non-reduced-motion client default, avoiding
  // a hydration mismatch. MotionProvider's MotionConfig reducedMotion="user"
  // also suppresses motion globally for reduced-motion users.
  const reducedMotion = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: ref,
    // 0 when section top reaches viewport top; 1 when section bottom exits viewport top.
    offset: ["start start", "end start"],
  });

  // Translate up by 50px over the full scroll range — slower than the
  // scroll speed creates the parallax depth effect. The useReducedMotion
  // guard below is what satisfies WCAG 2.3.3 (AAA, Animation from
  // Interactions); the 50px limit is a design choice, not a compliance
  // threshold.
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div ref={ref}>
      <m.div style={reducedMotion ? undefined : { y }}>
        {children}
      </m.div>
    </div>
  );
}

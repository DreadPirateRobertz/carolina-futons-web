"use client";

import { useRef } from "react";
import { m, useScroll, useTransform, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
};

export function HeroParallax({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    // 0 when section top reaches viewport top; 1 when section bottom exits viewport top.
    offset: ["start start", "end start"],
  });

  // Translate up by 50px over the full scroll range — slower than the
  // scroll speed creates the parallax depth effect. 50px ceiling keeps
  // vestibular impact well inside WCAG 2.3.3 tolerance.
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div ref={ref}>
      <m.div style={reducedMotion ? undefined : { y }}>
        {children}
      </m.div>
    </div>
  );
}

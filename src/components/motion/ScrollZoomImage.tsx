"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";

// cf-3qt.7.M.1 (bead cf-2i7): scroll-linked scale on the PDP main image.
// As the image passes through the viewport, its scale drifts from 1.0 to
// 1.06 — subtle cinematic zoom. The wrapper clips with overflow-hidden so
// the scaled image stays inside the gallery slot.
//
// Uses `m.*` (not `motion.*`) so the LazyMotion feature set in
// MotionProvider stays effective — importing `motion` would defeat the
// bundle budget that blaidd's foundation (PR #59) set.
//
// prefers-reduced-motion: Framer's useReducedMotion returns true → render
// a plain <img> with no MotionValue subscriptions, no scale, no overhead.

export type ScrollZoomImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  "data-testid"?: string;
};

export function ScrollZoomImage({
  src,
  alt,
  className,
  imgClassName,
  "data-testid": testId,
}: ScrollZoomImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // useScroll must be called unconditionally to satisfy the rules of hooks.
  // When reduced-motion is on we just ignore the resulting MotionValue.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.0, 1.06]);

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} data-testid={testId} className={imgClassName} />
      </div>
    );
  }

  return (
    <m.div ref={ref} className={className} style={{ scale }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} data-testid={testId} className={imgClassName} />
    </m.div>
  );
}

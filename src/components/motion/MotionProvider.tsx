"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

// LazyMotion wrapper that loads only the animation feature set (~25 KB gz),
// not the full motion bundle (~58 KB gz with drag/layout). All `m.*`
// components rendered inside this provider use the lazy features — keeps
// us under the Phase 7 motion-foundation budget while still supporting
// whileInView / variants / hover/tap gestures.
//
// MotionConfig reducedMotion="user" propagates the prefers-reduced-motion
// media query to every m.* descendant. This is load-bearing for WCAG 2.3.3:
// framer only auto-honors prefers-reduced-motion at the *variants* level,
// not when components pass literal `initial` / `animate` / `whileInView`
// objects (HeroReveal, the shop-by-category reveal, etc. all use literals).
// MotionConfig is a single point that closes that gap app-wide — vestibular
// users see the no-motion fallback regardless of how a downstream component
// chose to author its motion props.
//
// Note: components inside MUST use `m.*` (NOT `motion.*`) to avoid pulling
// in the full motion bundle and defeating the LazyMotion savings.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

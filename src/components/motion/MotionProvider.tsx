"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

// LazyMotion wrapper that loads only the animation feature set (~25 KB gz),
// not the full motion bundle (~58 KB gz with drag/layout). All `m.*`
// components rendered inside this provider use the lazy features — keeps
// us under the Phase 7 motion-foundation budget while still supporting
// whileInView / variants / hover/tap gestures.
//
// Note: components inside MUST use `m.*` (NOT `motion.*`) to avoid pulling
// in the full motion bundle and defeating the LazyMotion savings.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

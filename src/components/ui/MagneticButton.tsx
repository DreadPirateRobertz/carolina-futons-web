"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function queryReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Returns true when the user prefers reduced motion; updates reactively.
// useSyncExternalStore provides a stable server snapshot (false) and avoids
// hydration mismatches and tearing in concurrent React rendering.
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    queryReducedMotion,
    () => false,
  );
}

type MagneticButtonProps = {
  children: React.ReactNode;
  className?: string;
  // Max translate in each axis (px). Defaults to 6 (midpoint of 4-8 spec).
  maxTranslate?: number;
  // Fraction of center-to-edge distance applied as translate. 0.12 ≈ 6px on
  // a 100px-wide button when the cursor sits at the edge.
  strength?: number;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style">;

/**
 * Wraps any CTA content so the element gently drifts toward the cursor while
 * the pointer is inside it. On leave the element springs back.
 *
 * Fully inert when `prefers-reduced-motion: reduce` is active.
 */
export function MagneticButton({
  children,
  className,
  maxTranslate = 6,
  strength = 0.12,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const x = Math.max(-maxTranslate, Math.min(maxTranslate, dx * strength));
    const y = Math.max(-maxTranslate, Math.min(maxTranslate, dy * strength));
    setTranslate({ x, y });
  }

  function handleMouseLeave() {
    setTranslate({ x: 0, y: 0 });
  }

  const isAtRest = translate.x === 0 && translate.y === 0;

  return (
    <div
      {...rest}
      ref={ref}
      className={className}
      style={
        reduced
          ? undefined
          : {
              transform: `translate(${translate.x}px, ${translate.y}px)`,
              // Slow spring-back on leave, fast follow on move.
              transition: isAtRest
                ? "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                : "transform 0.08s ease-out",
              willChange: isAtRest ? "auto" : "transform",
            }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

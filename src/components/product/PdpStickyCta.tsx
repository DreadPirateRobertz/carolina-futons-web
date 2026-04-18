"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// cf-3qt.7.M.3 (cf-udfs): mobile bottom-sheet upgrade on top of the existing
// cf-3qt.6.F.3 sticky bar. On <768px the bar becomes a rounded-top card with
// a drag handle and an inline quantity stepper; slide-in is driven by
// m.div + spring, swipe-down dismisses until the primary CTA re-enters view.
// Desktop (md+) keeps the original bar surface so no visual regression.
//
// Swipe dismiss uses pointer events rather than framer-motion useDragControls
// so we stay on LazyMotion's `domAnimation` feature set from PR #59 — drag
// would require `domMax`, which would ~double the motion bundle.
//
// Reduced-motion: short-circuit to a plain div, no MotionValue subscriptions,
// no inline transform repaint — matching blaidd's HeroReveal pattern.

export type PdpStickyCtaProps = {
  visible: boolean;
  productName: string;
  formattedPrice: string;
  // ReactNode keeps the pre-7.M.3 call site signature (single AddToCartButton
  // passed in). The render-prop form lets a caller consume the sheet's
  // internal quantity state without lifting qty up to the PDP (which would
  // bleed into the primary CTA, changing its qty=1 contract).
  children: ReactNode | ((quantity: number) => ReactNode);
};

// Vertical pointer delta to count as a dismiss swipe. 80px is enough to avoid
// accidental dismissal from a fumbled tap or a short scroll near the sheet
// edge, but still feels responsive to an intentional downward drag.
const SWIPE_DISMISS_THRESHOLD_PX = 80;

export function PdpStickyCta({
  visible,
  productName,
  formattedPrice,
  children,
}: PdpStickyCtaProps) {
  const [quantity, setQuantity] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const pointerStartY = useRef<number | null>(null);
  const reduced = useReducedMotion();

  // Dismiss is per-appearance, not permanent — if the user scrolls the
  // primary CTA back into view and out again, the sheet can show again.
  useEffect(() => {
    if (visible) setDismissed(false);
  }, [visible]);

  if (!visible || dismissed) return null;

  const action =
    typeof children === "function" ? children(quantity) : children;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // setPointerCapture can be absent in jsdom — guard so tests don't throw.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerStartY.current = e.clientY;
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartY.current === null) return;
    const delta = e.clientY - pointerStartY.current;
    pointerStartY.current = null;
    if (delta > SWIPE_DISMISS_THRESHOLD_PX) setDismissed(true);
  };

  const wrapperClass =
    "fixed inset-x-0 bottom-0 z-40 border-t border-cf-sand/60 bg-white/95 px-4 pb-3 pt-5 backdrop-blur safe-area-inset-bottom print:hidden " +
    // Mobile bottom-sheet treatment; desktop reverts to the flat bar.
    "rounded-t-xl shadow-lg md:rounded-none md:shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:pt-3";

  const inner = (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        data-testid="pdp-sticky-drag-handle"
        aria-hidden="true"
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartY.current = null;
        }}
        className="absolute left-1/2 top-0 -mt-3 h-1 w-10 -translate-x-1/2 cursor-grab touch-none rounded-full bg-cf-sand/80 md:hidden"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cf-espresso">
            {productName}
          </p>
          <p className="text-sm text-cf-espresso/70">{formattedPrice}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          {action}
        </div>
      </div>
    </div>
  );

  if (reduced) {
    return (
      <div
        role="region"
        aria-label="Quick add to cart"
        data-slot="pdp-sticky-cta"
        className={wrapperClass}
      >
        {inner}
      </div>
    );
  }

  return (
    <m.div
      role="region"
      aria-label="Quick add to cart"
      data-slot="pdp-sticky-cta"
      className={wrapperClass}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
    >
      {inner}
    </m.div>
  );
}

// Inline +/- stepper with cf-cta accent on the active edge. md:hidden —
// desktop sticky keeps its minimal surface per the Phase 7 dispatch.
function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(value + 1);
  return (
    <div
      data-testid="pdp-sticky-qty"
      className="flex items-center gap-1 rounded-md border border-cf-sand/60 bg-white px-1 md:hidden"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={dec}
        disabled={value <= 1}
        className="flex h-8 w-8 items-center justify-center text-cf-cta disabled:text-cf-sand"
      >
        −
      </button>
      <span
        aria-live="polite"
        aria-label={`Quantity: ${value}`}
        className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums text-cf-espresso"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={inc}
        className="flex h-8 w-8 items-center justify-center text-cf-cta"
      >
        +
      </button>
    </div>
  );
}

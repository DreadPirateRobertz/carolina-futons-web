"use client";

import type { ReactNode } from "react";

export type PdpStickyCtaProps = {
  // Whether the sticky bar is currently displayed. Driven by an
  // IntersectionObserver in PdpInteractive that tracks the primary CTA — when
  // the primary button scrolls out of the viewport, visible becomes true.
  visible: boolean;
  productName: string;
  formattedPrice: string;
  // The add-to-cart element. Passed in as children so the sticky bar reuses
  // the same AddToCartButton props/handlers as the primary CTA without cloning
  // cart state here.
  children: ReactNode;
};

export function PdpStickyCta({
  visible,
  productName,
  formattedPrice,
  children,
}: PdpStickyCtaProps) {
  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label="Quick add to cart"
      data-slot="pdp-sticky-cta"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cf-sand/60 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur safe-area-inset-bottom print:hidden motion-reduce:transition-none"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cf-espresso">
            {productName}
          </p>
          <p className="text-sm text-cf-espresso/70">{formattedPrice}</p>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}

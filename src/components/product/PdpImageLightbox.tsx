"use client";

import { useEffect, useRef } from "react";
import { m, useReducedMotion } from "framer-motion";

// PDP image zoom lightbox (cf-nmwy). Full-screen overlay showing the
// full-res product image. Opens on main-image click, dismisses on ESC or
// click-outside (backdrop). Reduced-motion users skip the opacity
// crossfade (the overlay appears instantly) — the dialog still opens,
// motion is the only thing suppressed per WCAG 2.3.3.
//
// Not a portal: Next.js server + client components mix awkwardly with
// createPortal, and a fixed-positioned element covers the viewport just
// as well. The surrounding layout has z-index 0 by default; this uses
// z-50 to stay above the sticky CTA (z-40).
export function PdpImageLightbox({
  open,
  onClose,
  src,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // ESC dismissal. Listener is attached at the document level so it works
  // regardless of focus target (click-outside may move focus to the
  // backdrop, and we still want ESC to dismiss from anywhere on the page).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus to the close button when the lightbox opens so keyboard
  // users land on an actionable control, not in the scroll container.
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const crossfadeProps = reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      };

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — full-size image`}
      data-slot="pdp-image-lightbox"
      data-reduced-motion={reduce ? "1" : "0"}
      onClick={(e) => {
        // Click-outside dismissal. Only fire when the click target IS the
        // backdrop itself — clicks on the image or the close button
        // bubble here too but we don't want those to close.
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      {...crossfadeProps}
    >
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ×
        </span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        data-testid="pdp-lightbox-image"
        className="max-h-full max-w-full object-contain"
      />
    </m.div>
  );
}

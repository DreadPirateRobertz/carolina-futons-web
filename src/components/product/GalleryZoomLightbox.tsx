"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { m, useReducedMotion } from "framer-motion";

import { wixImageUrl } from "@/lib/wix/wix-image";

type Point = { x: number; y: number };

// cfw-zd8: full-screen gallery zoom lightbox. Replaces the cf-nmwy single-
// image lightbox. Adds:
// - pinch-to-zoom on touch, wheel-zoom on desktop (scale clamped 1..MAX_SCALE)
// - pan/drag while zoomed
// - ←/→ keys + horizontal swipe navigate adjacent images (when not zoomed)
// - body-scroll lock while open
// - focus moved to the close button on open; Tab-cycle kept inside the dialog
// - ESC / X / backdrop dismissal
//
// Pointer Events unify mouse + touch + pen so we don't ship two code paths.
// Pinch detection looks for exactly two active pointers; pan/swipe runs with
// one. We branch single-pointer behavior on `scale > 1`: zoomed = pan,
// not-zoomed = swipe-to-navigate.

export type GalleryZoomImage = {
  url: string;
  alt?: string;
};

export interface GalleryZoomLightboxProps {
  open: boolean;
  onClose: () => void;
  images: ReadonlyArray<GalleryZoomImage>;
  initialIndex: number;
  productName: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
// Wheel deltaY is ~100 per notch on most platforms; this maps one notch to a
// ~10% scale step, which feels close to native pinch on Mac touchpads.
const WHEEL_ZOOM_FACTOR = 0.001;
// Horizontal swipe distance (in px) required to advance an image when not
// zoomed. Below this threshold, the gesture is treated as an accidental drag.
const SWIPE_THRESHOLD_PX = 60;

const HEADING_ID = "gallery-zoom-lightbox-heading";

export function GalleryZoomLightbox({
  open,
  onClose,
  images,
  initialIndex,
  productName,
}: GalleryZoomLightboxProps) {
  const reduce = useReducedMotion() ?? false;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);

  const safeInitial = useMemo(() => {
    if (images.length === 0) return 0;
    return Math.min(Math.max(initialIndex, 0), images.length - 1);
  }, [images.length, initialIndex]);

  const [index, setIndex] = useState(safeInitial);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Reset transform + index on the open=false → open=true transition. Adjust-
  // state-during-render (vs. an effect) keeps the visible transform in sync
  // with the open prop in a single paint and avoids the cascading-renders
  // lint rule. Mirrors the activeUrl→selectedIndex pattern in PdpGallery.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIndex(safeInitial);
      setScale(1);
      setTx(0);
      setTy(0);
    }
  }

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      const wrapped = ((next % images.length) + images.length) % images.length;
      setIndex(wrapped);
      // Image change always resets zoom — otherwise the next photo would
      // load already panned/scaled which is disorienting.
      setScale(1);
      setTx(0);
      setTy(0);
    },
    [images.length],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Body scroll-lock while the dialog is open. Restoring the prior overflow
  // value (rather than hard-setting to "") is what keeps this safe to nest
  // under any parent that may already lock scroll for its own reasons.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Document-level keyboard handling: ESC closes; ←/→ navigate when not
  // zoomed (zoomed state reserves arrow keys for future pan-by-keys, but
  // for now we still let navigation through — pan is pointer-only).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (images.length <= 1) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, next, prev, images.length]);

  // Move focus to the close button on open. We rely on the focus trap below
  // to keep keyboard users inside the dialog after that.
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  // Pointer/gesture state. Lives in refs because this updates on every move
  // event and we don't want React renders for raw pointer tracking.
  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const dragStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    mode: "pan" | "swipe";
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (pointers.current.size === 2) {
      const vals: Point[] = Array.from(pointers.current.values());
      const [a, b] = vals;
      pinchStart.current = {
        distance: distance(a!, b!),
        scale,
      };
      dragStart.current = null;
      return;
    }

    // Single pointer: pan when zoomed, swipe-to-navigate when not.
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx,
      ty,
      mode: scale > 1 ? "pan" : "swipe",
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const vals: Point[] = Array.from(pointers.current.values());
      const [a, b] = vals;
      const d = distance(a!, b!);
      const ratio = d / pinchStart.current.distance;
      const nextScale = clamp(
        pinchStart.current.scale * ratio,
        MIN_SCALE,
        MAX_SCALE,
      );
      setScale(nextScale);
      // When pinch drops back to ~1, snap pan to origin so the image isn't
      // left visually offset after an over-pan.
      if (nextScale <= MIN_SCALE + 0.01) {
        setTx(0);
        setTy(0);
      }
      return;
    }

    if (pointers.current.size === 1 && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (dragStart.current.mode === "pan") {
        setTx(dragStart.current.tx + dx);
        setTy(dragStart.current.ty + dy);
      }
      // swipe mode commits on pointer-up so a small accidental drag during a
      // tap doesn't fire a navigation.
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = dragStart.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) pinchStart.current = null;

    if (wasSingle && start && start.mode === "swipe" && images.length > 1) {
      const dx = e.clientX - start.x;
      if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
        if (dx < 0) next();
        else prev();
      }
    }

    if (pointers.current.size === 0) dragStart.current = null;
  };

  const onWheel = (e: ReactWheelEvent) => {
    // ctrlKey on wheel = trackpad pinch (browsers normalize pinch as
    // ctrl+wheel). Plain wheel is desktop scroll-zoom. Either way we treat
    // deltaY < 0 as zoom-in.
    e.preventDefault();
    const delta = -e.deltaY * WHEEL_ZOOM_FACTOR;
    const nextScale = clamp(scale + delta * scale, MIN_SCALE, MAX_SCALE);
    setScale(nextScale);
    if (nextScale <= MIN_SCALE + 0.01) {
      setTx(0);
      setTy(0);
    }
  };

  // Focus trap — keep Tab inside the dialog. With only the close button as a
  // focusable element today, this collapses to "Tab keeps focus on close".
  const onDialogKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open || images.length === 0) return null;

  const safeIndex = Math.min(index, images.length - 1);
  const active = images[safeIndex]!;
  const altText = active.alt ?? productName;
  const ariaLabel = `${altText} — full-size image, ${safeIndex + 1} of ${images.length}`;

  const crossfadeProps = reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      };

  return (
    <m.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={HEADING_ID}
      data-slot="gallery-zoom-lightbox"
      data-reduced-motion={reduce ? "1" : "0"}
      data-zoomed={scale > 1 ? "1" : "0"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onDialogKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 p-4 sm:p-8"
      {...crossfadeProps}
    >
      <h2 id={HEADING_ID} className="sr-only">
        {productName} image viewer
      </h2>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        data-testid="gallery-zoom-close"
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          ×
        </span>
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            data-testid="gallery-zoom-prev"
            className="absolute left-4 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            data-testid="gallery-zoom-next"
            className="absolute right-4 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ›
            </span>
          </button>
          <p
            data-testid="gallery-zoom-counter"
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white"
          >
            {safeIndex + 1} / {images.length}
          </p>
        </>
      ) : null}
      <div
        ref={imageWrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2))}
        className="flex h-full w-full items-center justify-center touch-none select-none"
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wixImageUrl(active.url, 1280, 1280)}
          alt={altText}
          data-testid="gallery-zoom-image"
          draggable={false}
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
            transformOrigin: "center center",
            transition: scale === 1 && tx === 0 && ty === 0 ? "transform 0.18s ease-out" : "none",
          }}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </m.div>
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

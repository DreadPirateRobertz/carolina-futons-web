"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const AUTO_SPIN_ROTATIONS = 3;
const AUTO_SPIN_INTERVAL_MS = 60;
// cfw-x3w: continuous user-toggle auto-rotate uses 100 ms/frame per the spec.
const AUTO_ROTATE_INTERVAL_MS = 100;
const PX_PER_FRAME = 8;

// ── Pure helpers — frame math and spin sequencing ─────────────────────────────

export function computeFrameIndex(
  currentIndex: number,
  deltaPx: number,
  totalFrames: number,
  pxPerFrame = PX_PER_FRAME
): number {
  if (totalFrames <= 0) return 0;
  const frameDelta = Math.round(deltaPx / pxPerFrame);
  return ((currentIndex + frameDelta) % totalFrames + totalFrames) % totalFrames;
}

export function buildAutoSpinSequence(totalFrames: number, rotations: number): number[] {
  if (totalFrames <= 0 || rotations <= 0) return [];
  const frames: number[] = [];
  for (let r = 0; r < rotations; r++) {
    for (let i = 0; i < totalFrames; i++) frames.push(i);
  }
  return frames;
}

export function shouldShowSpinViewer(spinImages: string[] | undefined | null): boolean {
  return Array.isArray(spinImages) && spinImages.length >= 2;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  spinImages: string[];
  productName?: string;
};

export function ProductSpinViewer({ spinImages, productName = "product" }: Props) {
  const [frame, setFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // cfw-x3w: continuous auto-rotate toggle. Distinct from the mount auto-spin
  // (which runs once for AUTO_SPIN_ROTATIONS); this loops indefinitely until
  // the user toggles it off or interacts with the viewer.
  const [autoRotate, setAutoRotate] = useState(false);
  // Lazy init reads matchMedia synchronously so reduced-motion users never see even one auto-spin tick
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const frameAtDragStart = useRef(0);
  // Mirrors `frame` state so non-React handlers read the current value without stale closures
  const frameRef = useRef(0);
  const autoSpinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalFrames = spinImages.length;

  // Sync frameRef outside of render — keeps non-React handlers stale-closure free
  useLayoutEffect(() => {
    frameRef.current = frame;
  });

  // SSR-safe reduced-motion detection — fires when OS preference changes mid-session
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch {
      // matchMedia unavailable — SSR default (false) stands
    }
  }, []);

  // Preload all frames so swaps are instant
  useEffect(() => {
    for (const src of spinImages) {
      const img = new window.Image();
      img.src = src;
    }
  }, [spinImages]);

  // Auto-spin 3 rotations on mount; user interaction cancels it via autoSpinTimerRef
  useEffect(() => {
    if (prefersReducedMotion) return;
    const sequence = buildAutoSpinSequence(totalFrames, AUTO_SPIN_ROTATIONS);
    // Start at step 1: skip sequence[0] since we're already rendering frame 0
    let step = 1;
    const timer = setInterval(() => {
      if (step >= sequence.length) {
        clearInterval(timer);
        autoSpinTimerRef.current = null;
        return;
      }
      setFrame(sequence[step++]);
    }, AUTO_SPIN_INTERVAL_MS);
    autoSpinTimerRef.current = timer;
    return () => {
      clearInterval(timer);
      autoSpinTimerRef.current = null;
    };
  }, [totalFrames, prefersReducedMotion]);

  // Non-passive touchmove so we can call preventDefault and block page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragStartX.current === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      const delta = touch.clientX - dragStartX.current;
      setFrame(computeFrameIndex(frameAtDragStart.current, delta, totalFrames));
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [totalFrames]);

  function cancelAutoSpin() {
    if (autoSpinTimerRef.current !== null) {
      clearInterval(autoSpinTimerRef.current);
      autoSpinTimerRef.current = null;
    }
    if (autoRotateTimerRef.current !== null) {
      clearInterval(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }
    if (autoRotate) setAutoRotate(false);
  }

  // cfw-x3w: continuous auto-rotate driven by the toggle button. Reduced-motion
  // users can still flip it on intentionally — the mount auto-spin honors the
  // OS preference, but a user-initiated toggle is an explicit consent.
  useEffect(() => {
    if (!autoRotate) return;
    if (totalFrames <= 0) return;
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % totalFrames);
    }, AUTO_ROTATE_INTERVAL_MS);
    autoRotateTimerRef.current = timer;
    return () => {
      clearInterval(timer);
      autoRotateTimerRef.current = null;
    };
  }, [autoRotate, totalFrames]);

  function handleMouseDown(e: React.MouseEvent) {
    cancelAutoSpin();
    dragStartX.current = e.clientX;
    frameAtDragStart.current = frameRef.current;
    setIsDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    setFrame(computeFrameIndex(frameAtDragStart.current, delta, totalFrames));
  }

  function stopDrag() {
    dragStartX.current = null;
    setIsDragging(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    cancelAutoSpin();
    dragStartX.current = touch.clientX;
    frameAtDragStart.current = frameRef.current;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      cancelAutoSpin();
      setFrame((f) => computeFrameIndex(f, PX_PER_FRAME, totalFrames));
    } else if (e.key === "ArrowLeft") {
      cancelAutoSpin();
      setFrame((f) => computeFrameIndex(f, -PX_PER_FRAME, totalFrames));
    }
  }

  // Guard against caller passing an empty array (shouldShowSpinViewer is the caller contract)
  const currentSrc = spinImages[frame] ?? spinImages[0];

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, totalFrames - 1)}
      aria-valuenow={frame}
      aria-valuetext={`${productName} — frame ${frame + 1} of ${totalFrames}`}
      aria-label={`360° interactive view of ${productName}. Drag or use arrow keys to rotate.`}
      tabIndex={0}
      data-testid="product-spin-viewer"
      className="relative aspect-square w-full select-none overflow-hidden rounded-lg bg-cf-sand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={handleTouchStart}
      onTouchEnd={stopDrag}
      onKeyDown={handleKeyDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none h-full w-full object-cover"
        draggable={false}
        data-testid="spin-frame-img"
      />
      <span
        aria-hidden="true"
        className="absolute left-3 top-3 rounded-full bg-cf-navy/80 px-2 py-0.5 text-xs font-semibold text-cf-cream"
        data-testid="spin-badge"
      >
        360°
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-cf-navy/60 px-3 py-1 text-xs text-cf-cream"
        data-testid="spin-hint"
      >
        Drag to rotate
      </span>
      <button
        type="button"
        aria-pressed={autoRotate}
        aria-label={autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
        data-testid="spin-auto-rotate-toggle"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setAutoRotate((v) => !v);
        }}
        className="absolute right-3 top-3 rounded-full bg-cf-navy/80 px-3 py-1 text-xs font-semibold text-cf-cream hover:bg-cf-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {autoRotate ? "Pause" : "Auto-rotate"}
      </button>
    </div>
  );
}

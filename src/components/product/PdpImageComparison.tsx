"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GalleryImage } from "./PdpGallery";

export type PdpImageComparisonProps = {
  before: GalleryImage;
  after: GalleryImage;
  productName: string;
  onClose: () => void;
};

const HANDLE_W = 40; // px — accessible drag handle width

export function PdpImageComparison({
  before,
  after,
  productName,
  onClose,
}: PdpImageComparisonProps) {
  const [splitPct, setSplitPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Detach race or unsupported browser — drag still works via mousemove
    }
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  // Keyboard: ArrowLeft/Right move the split by 5%
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSplitPct((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSplitPct((p) => Math.min(100, p + 5));
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      data-testid="pdp-image-comparison"
      className="relative aspect-square w-full select-none overflow-hidden rounded-lg"
    >
      {/* "after" image — full width, underneath */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after.url}
        alt={after.alt ?? `${productName} — angle 2`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={(e) => console.warn("[PdpImageComparison] after image failed:", (e.target as HTMLImageElement).src)}
      />

      {/* "before" image — clipped to the left portion */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before.url}
          alt={before.alt ?? `${productName} — angle 1`}
          className="h-full w-full object-cover"
          draggable={false}
          onError={(e) => console.warn("[PdpImageComparison] before image failed:", (e.target as HTMLImageElement).src)}
        />
      </div>

      {/* Drag handle */}
      <div
        role="slider"
        aria-label="Image comparison split"
        aria-valuenow={Math.round(splitPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        data-testid="pdp-comparison-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        style={{ left: `calc(${splitPct}% - ${HANDLE_W / 2}px)`, width: HANDLE_W }}
        className="absolute inset-y-0 z-10 flex cursor-col-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <div
          className="h-full w-px bg-white/80"
          aria-hidden="true"
        />
        <div
          className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 16 16"
            width={16}
            height={16}
            fill="none"
            className="text-cf-ink"
            aria-hidden="true"
          >
            <path
              d="M5 8l-3 0M5 8l-2-2m2 2l-2 2M11 8l3 0M11 8l2-2m-2 2l2 2"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-xs text-white"
      >
        Angle 1
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/40 px-2 py-0.5 text-xs text-white"
      >
        Angle 2
      </span>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close comparison"
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg
          viewBox="0 0 16 16"
          width={12}
          height={12}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 2l12 12M14 2L2 14"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

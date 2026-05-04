"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { spinWheel } from "@/app/actions/spin";
import {
  SPIN_PRIZES,
  initialSpinActionState,
  type SpinPrize,
} from "@/app/spin/spin-state";

const SEGMENT_COUNT = SPIN_PRIZES.length;
const SEGMENT_DEG = 360 / SEGMENT_COUNT;
const SPIN_REVOLUTIONS = 5;

function buildArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function WheelSvg({ rotation, animating }: { rotation: number; animating: boolean }) {
  const cx = 150;
  const cy = 150;
  const r = 140;

  return (
    <svg
      viewBox="0 0 300 300"
      aria-hidden="true"
      className="w-full max-w-xs"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: animating ? `transform ${SPIN_REVOLUTIONS * 0.5}s cubic-bezier(0.17, 0.67, 0.21, 0.99)` : "none",
      }}
    >
      {SPIN_PRIZES.map((prize, i) => {
        const startDeg = i * SEGMENT_DEG - 90;
        const endDeg = startDeg + SEGMENT_DEG;
        const midDeg = startDeg + SEGMENT_DEG / 2;
        const midRad = (midDeg * Math.PI) / 180;
        const textR = r * 0.65;
        const tx = cx + textR * Math.cos(midRad);
        const ty = cy + textR * Math.sin(midRad);
        return (
          <g key={prize.id}>
            <path d={buildArcPath(cx, cy, r, startDeg, endDeg)} fill={prize.color} stroke="#fff" strokeWidth={2} />
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={11}
              fontWeight={600}
              transform={`rotate(${midDeg + 90}, ${tx}, ${ty})`}
            >
              {prize.label}
            </text>
          </g>
        );
      })}
      {/* Center hub */}
      <circle cx={cx} cy={cy} r={16} fill="#fff" stroke="#ccc" strokeWidth={2} />
    </svg>
  );
}

export function SpinWheel() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [state, action, isPending] = useActionState(spinWheel, initialSpinActionState);
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const lastPrize = useRef<SpinPrize | null>(null);

  useEffect(() => {
    if (state.status !== "success") return;
    const prize = state.prize;
    lastPrize.current = prize;

    if (!prefersReducedMotion) {
      const prizeIndex = SPIN_PRIZES.findIndex((p) => p.id === prize.id);
      const targetSegmentCenter = prizeIndex * SEGMENT_DEG + SEGMENT_DEG / 2;
      // Wheel needs to land with the prize segment at top (pointer at 12 o'clock)
      const stopAt = 360 - targetSegmentCenter;
      const finalRotation = SPIN_REVOLUTIONS * 360 + stopAt;
      setAnimating(true);
      setRotation((prev) => prev + finalRotation);
      const dur = SPIN_REVOLUTIONS * 500;
      setTimeout(() => setAnimating(false), dur);
    }
  }, [state, prefersReducedMotion]);

  return (
    <div data-slot="spin-wheel" className="flex flex-col items-center gap-6">
      {/* Pointer triangle */}
      <div className="relative w-full max-w-xs">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "22px solid #3A2518",
          }}
        />
        <WheelSvg rotation={rotation} animating={animating} />
      </div>

      {state.status === "success" && (
        <div
          data-testid="spin-prize"
          className="rounded-lg border border-cf-divider bg-cf-cream px-6 py-4 text-center"
        >
          <p className="font-heading text-xl font-semibold text-cf-navy">
            {state.prize.label}
          </p>
          <p className="mt-1 text-sm text-cf-charcoal/70">
            {state.prize.description}
          </p>
          <p className="mt-3 text-xs text-cf-charcoal/50">
            Come back in {state.cooldownHours} hours for another spin.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.status !== "success" && (
        <form action={action}>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-full bg-cf-cta px-8 py-3 font-medium text-white transition-colors hover:bg-cf-cta-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            {isPending ? "Spinning…" : "Spin the wheel"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

// Time-of-day cycling hero for the Carolina Futons home page.
// cf-wmha — integrated bear+sun+stars LIVING landing.
//
// Phase selection mirrors the LivingSky keyframe table (living-sky.ts):
//   night   h < 5 or h >= 20   → StargazingHero (bear lying under stars)
//   dawn    h 5 – 7             → VintageSunRays (giant sunburst, dawn palette)
//   day     h 7 – 17            → MascotWorldHero (bear on porch, cursor eyes)
//   dusk    h 17 – 20           → VintageSunRays (giant sunburst, dusk palette)
//
// Cross-fade between phases is a 90s CSS opacity transition so the switch
// is perceptible but not jarring.

import { useEffect, useRef, useState } from "react";

import { MascotWorldHero } from "@/components/mascot/MascotWorldHero";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { StargazingHero } from "@/components/mascot/StargazingHero";

type Phase = "night" | "dawn" | "day" | "dusk";

function getPhase(h: number): Phase {
  if (h < 5 || h >= 20) return "night";
  if (h < 7) return "dawn";
  if (h < 17) return "day";
  return "dusk";
}

export function LivingHero() {
  const [phase, setPhase] = useState<Phase>("day"); // SSR default — suppressed until mounted
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Resolve correct phase from wall clock immediately on mount.
    // React batches both setState calls so they apply in a single render
    // before any transition can fire — no flash of the wrong scene.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client seed for SSR phase fallback
    setPhase(getPhase(new Date().getHours()));
    setMounted(true);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client seed for SSR motion fallback
    setReduceMotion(mq.matches);
    const onMotion = () => setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onMotion);

    // Update phase every minute
    const id = setInterval(() => {
      setPhase(getPhase(new Date().getHours()));
    }, 60_000);

    // Animation time for dawn/dusk rays + stargazing fireflies/shooting star.
    // Skip the RAF entirely when reduce-motion is on — components compute
    // static-friendly state when time stays at 0.
    if (!mq.matches) {
      const start = performance.now();
      const tick = (now: number) => {
        setTime((now - start) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      clearInterval(id);
      mq.removeEventListener?.("change", onMotion);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      data-slot="living-hero"
      style={{ position: "relative", width: "100%", height: "100%" }}
      aria-label={
        phase === "night"
          ? "Bear stargazing on a Blue Ridge hillside at night"
          : phase === "dawn"
            ? "Giant sunburst over the Blue Ridge mountains at dawn"
            : phase === "dusk"
              ? "Giant sunburst over the Blue Ridge mountains at dusk"
              : "Bear in the Blue Ridge mountains"
      }
    >
      {/* Night — stargazing bear */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: phase === "night" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: phase === "night" ? "auto" : "none",
        }}
      >
        <StargazingHero time={time} reduceMotion={reduceMotion} />
      </div>

      {/* Dawn — vintage sunburst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: phase === "dawn" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: phase === "dawn" ? "auto" : "none",
        }}
      >
        <VintageSunRays phase="dawn" time={time} />
      </div>

      {/* Day — mascot world with cursor-tracking bear */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: phase === "day" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: phase === "day" ? "auto" : "none",
        }}
      >
        <MascotWorldHero />
      </div>

      {/* Dusk — vintage sunburst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: phase === "dusk" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: phase === "dusk" ? "auto" : "none",
        }}
      >
        <VintageSunRays phase="dusk" time={time} />
      </div>
    </div>
  );
}

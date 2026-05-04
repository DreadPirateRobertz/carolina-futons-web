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
// Cross-fade between phases is a 4s CSS opacity transition so the switch
// is perceptible but not jarring.

import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";
import { MascotWorldHero } from "@/components/mascot/MascotWorldHero";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { StargazingHero } from "@/components/mascot/StargazingHero";

export function LivingHero() {
  const { phase, time, mounted, reduceMotion } = useTimeOfDay({ trackTime: true });

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
          opacity: !mounted ? 0 : phase === "night" ? 1 : 0,
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
          opacity: !mounted ? 0 : phase === "dawn" ? 1 : 0,
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
          opacity: !mounted ? 0 : phase === "day" ? 1 : 0,
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
          opacity: !mounted ? 0 : phase === "dusk" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: phase === "dusk" ? "auto" : "none",
        }}
      >
        <VintageSunRays phase="dusk" time={time} />
      </div>
    </div>
  );
}

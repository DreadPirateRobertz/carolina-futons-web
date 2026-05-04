"use client";

// cf-j6ub — animated time-of-day background for the site footer.
// Uses the same useTimeOfDay hook logic as LivingHero (no RAF — footer
// drives CSS animations, not JS-ticked values). Stacks four gradient
// layers that cross-fade on phase change, matching LivingHero's style.

import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";
import type { Phase } from "@/lib/hooks/useTimeOfDay";

// Dark atmospheric gradients — dark enough to keep cf-cream text readable.
const PHASE_GRADIENT: Record<Phase, readonly [string, string, string]> = {
  night: ["#060d1a", "#0d1a2e", "#152238"],
  dawn:  ["#1a0e08", "#28160a", "#38200e"],
  day:   ["#0c1a2c", "#122038", "#162843"],
  dusk:  ["#1a0600", "#2e0e04", "#3c1206"],
};

// Dawn/dusk horizon glow colours.
const ORB_GRADIENT: Record<"dawn" | "dusk", string> = {
  dawn: "radial-gradient(ellipse at center, rgba(244,168,120,0.13) 0%, transparent 70%)",
  dusk: "radial-gradient(ellipse at center, rgba(220,100,40,0.16) 0%, transparent 70%)",
};

const PHASES: readonly Phase[] = ["night", "dawn", "day", "dusk"];

export function LivingFooterBg() {
  const { phase, reduceMotion, mounted } = useTimeOfDay();

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Four gradient layers, one per phase — cross-fade on phase change */}
      {PHASES.map((p) => {
        const [from, via, to] = PHASE_GRADIENT[p];
        return (
          <div
            key={p}
            style={{
              position: "absolute",
              inset: 0,
              opacity: mounted && phase === p ? 1 : 0,
              transition: mounted ? "opacity 4s ease-in-out" : "none",
              background: `linear-gradient(to bottom, ${from}, ${via}, ${to}, ${via}, ${from})`,
              backgroundSize: "100% 200%",
              backgroundPosition: "0% 0%",
              animation:
                mounted && phase === p && !reduceMotion
                  ? "cf-footer-drift 14s ease-in-out infinite alternate"
                  : undefined,
            }}
          />
        );
      })}

      {/* Dawn / dusk: ambient horizon glow */}
      {(["dawn", "dusk"] as const).map((p) => (
        <div
          key={p}
          style={{
            position: "absolute",
            bottom: "-25%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            paddingBottom: "25%",
            borderRadius: "50%",
            background: ORB_GRADIENT[p],
            opacity: mounted && phase === p ? 1 : 0,
            transition: mounted ? "opacity 4s ease-in-out" : "none",
            animation:
              mounted && phase === p && !reduceMotion
                ? "cf-footer-orb 8s ease-in-out infinite alternate"
                : undefined,
          }}
        />
      ))}
    </div>
  );
}

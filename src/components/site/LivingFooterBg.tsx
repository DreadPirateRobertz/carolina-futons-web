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

// Night stars — stable seeded positions for consistent SSR/CSR output.
const STARS: ReadonlyArray<{
  cx: number; cy: number; r: number; delay: string;
}> = [
  { cx: 8,  cy: 22, r: 1.2, delay: "0s"   },
  { cx: 18, cy: 65, r: 0.8, delay: "1.1s" },
  { cx: 27, cy: 32, r: 1.5, delay: "0.5s" },
  { cx: 38, cy: 78, r: 0.9, delay: "1.8s" },
  { cx: 47, cy: 14, r: 1.1, delay: "0.3s" },
  { cx: 56, cy: 55, r: 1.3, delay: "2.2s" },
  { cx: 65, cy: 38, r: 0.7, delay: "0.9s" },
  { cx: 73, cy: 82, r: 1.0, delay: "1.5s" },
  { cx: 82, cy: 28, r: 1.4, delay: "0.2s" },
  { cx: 91, cy: 68, r: 0.8, delay: "1.7s" },
  { cx: 95, cy: 48, r: 1.2, delay: "0.6s" },
  { cx: 14, cy: 88, r: 0.9, delay: "2.0s" },
  { cx: 44, cy: 92, r: 1.1, delay: "1.3s" },
  { cx: 76, cy: 10, r: 0.7, delay: "0.4s" },
];

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

      {/* Night: twinkling star field */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: mounted && phase === "night" ? 1 : 0,
          transition: mounted ? "opacity 4s ease-in-out" : "none",
          pointerEvents: "none",
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {STARS.map((s) => (
          <circle
            key={`${s.cx}-${s.cy}`}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="white"
            style={
              reduceMotion
                ? { opacity: 0.5 }
                : { animation: `cf-star-twinkle 3s ease-in-out ${s.delay} infinite` }
            }
          />
        ))}
      </svg>

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

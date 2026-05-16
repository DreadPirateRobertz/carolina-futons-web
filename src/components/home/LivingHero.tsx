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
//
// cf-byms: SSR + first paint mount only the ACTIVE phase. The other three
// hero SVGs were the LCP-killer on Home — three full-bleed SVGs sat in the
// DOM with opacity:0 but still painted/composited every frame. Lazy-mount
// the inactive phases via requestIdleCallback so they're ready for the
// next phase-boundary cross-fade (which fires every few hours, not in
// the LCP window).

import { useEffect, useState, type ReactNode } from "react";

import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";
import { MascotWorldHero } from "@/components/mascot/MascotWorldHero";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { StargazingHero } from "@/components/mascot/StargazingHero";

export function LivingHero({ compact = false }: { compact?: boolean } = {}) {
  const { phase, time, mounted, reduceMotion } = useTimeOfDay({
    trackTime: true,
  });

  // Mount the three non-active phases lazily so initial render paints
  // only one full-bleed SVG. The other three appear after first idle —
  // by the time any phase boundary fires (hours later), all four are
  // mounted and the 4s cross-fade plays normally.
  const [mountInactive, setMountInactive] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ric =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => {
          cb({ didTimeout: false, timeRemaining: () => 50 });
        }, 200));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = ric(() => setMountInactive(true));
    return () => {
      try {
        cic(handle as number);
      } catch {
        /* requestIdleCallback handle types vary across browsers; the
           cleanup is best-effort — failing it is harmless because the
           callback only flips a state flag. */
      }
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
      <Phase
        active={phase === "night"}
        mounted={mounted}
        mountInactive={mountInactive}
      >
        <StargazingHero
          time={time}
          reduceMotion={reduceMotion}
          compact={compact}
        />
      </Phase>
      <Phase
        active={phase === "dawn"}
        mounted={mounted}
        mountInactive={mountInactive}
      >
        <VintageSunRays phase="dawn" time={time} />
      </Phase>
      <Phase
        active={phase === "day"}
        mounted={mounted}
        mountInactive={mountInactive}
      >
        <MascotWorldHero />
      </Phase>
      <Phase
        active={phase === "dusk"}
        mounted={mounted}
        mountInactive={mountInactive}
      >
        <VintageSunRays phase="dusk" time={time} />
      </Phase>
    </div>
  );
}

function Phase({
  active,
  mounted,
  mountInactive,
  children,
}: {
  active: boolean;
  mounted: boolean;
  mountInactive: boolean;
  children: ReactNode;
}) {
  // Skip the DOM node entirely until either this phase is active or the
  // post-paint idle callback has flipped mountInactive. Skipping the node
  // means the browser doesn't paint or composite this SVG at all on the
  // critical path.
  if (!active && !mountInactive) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        // cfw-qz7: paint the active phase at full opacity on SSR + first
        // client frame. Pre-fix the `!mounted ? 0 :` gate sent the active
        // phase to opacity 0 until hydration completed, and browsers do
        // not measure LCP on opacity:0 elements — Home LCP fell back to
        // smaller in-view text. SSR's default phase ("day" per useTimeOfDay's
        // initial state) renders at opacity 1; if the hydrated real phase
        // differs (night/dawn/dusk), the post-mount transition (next line)
        // takes care of the cross-fade.
        opacity: active ? 1 : 0,
        transition: mounted ? "opacity 4s ease-in-out" : "none",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

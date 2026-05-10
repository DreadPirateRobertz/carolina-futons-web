// cf-93rb-livingsky-dynamic. Server-component facade for the dynamic
// Living Blue Ridge Sky. Routes consumption through here so callers
// don't need to import the Client Component directly — keeps the
// public surface stable across future engine iterations.
//
// Phase A shipped this as a static next/image — Stilgar caught that
// the Velo source is a 16-keyframe time-of-day animation. This now
// renders the inline SVG body via a Client Component that ticks the
// engine every 60s. SSR + first paint show the midday default state
// so there is no flash before hydration.

import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";

export type LivingSkyProps = {
  // Optional descriptive label override. Default lives inside the SVG
  // <title>; consumers normally don't need to override it.
  className?: string;
  /**
   * cf-96m8 — pin to midnight regardless of wall clock or theme. The
   * footer renders the always-night backdrop while the header keeps
   * cycling through day/dusk/night.
   */
  forceNight?: boolean;
};

export function LivingSky({ className, forceNight = false }: LivingSkyProps = {}) {
  return (
    <div
      data-slot="living-sky"
      data-force-night={forceNight ? "true" : undefined}
      className={`w-full ${className ?? ""}`.trim()}
    >
      <LivingSkyClient forceNight={forceNight} />
    </div>
  );
}

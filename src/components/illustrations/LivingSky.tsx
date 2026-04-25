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
};

export function LivingSky({ className }: LivingSkyProps = {}) {
  return (
    <div
      data-slot="living-sky"
      className={`w-full ${className ?? ""}`.trim()}
    >
      <LivingSkyClient />
    </div>
  );
}

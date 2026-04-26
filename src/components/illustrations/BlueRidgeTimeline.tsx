import { AboutIllustrationClient } from "@/components/illustrations/AboutIllustrationClient";
import { TIMELINE_SVG_BODY } from "@/lib/illustrations/about-illustrations-svg";

// cf-about-illus: Blue Ridge Timeline scene (1200×400). Four milestone
// waypoints (1991, 2005, 2015, present) as glowing dots on a dashed trail
// across layered ridges. Inline SVG (not next/image) is required so the
// LivingSky overlay can mutate DOM elements after mount.

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 400;

export type BlueRidgeTimelineProps = {
  className?: string;
};

export function BlueRidgeTimeline({ className }: BlueRidgeTimelineProps) {
  return (
    <div data-slot="blue-ridge-timeline" className={className}>
      <AboutIllustrationClient
        svgBody={TIMELINE_SVG_BODY}
        viewWidth={VIEW_WIDTH}
        viewHeight={VIEW_HEIGHT}
        titleId="title-timeline"
      />
    </div>
  );
}

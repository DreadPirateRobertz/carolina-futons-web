import Image from "next/image";

// cf-93rb Phase A. Wide editorial illustration for /about — Carolina
// Futons milestones (1991, 2005, 2015, present) as glowing waypoints
// across a layered Blue Ridge scene. Source SVG (1200×400) carries a
// descriptive <title> so screen-reader users get the company history
// summary. Default alt mirrors the source title.

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 400;

export type BlueRidgeTimelineProps = {
  alt?: string;
  className?: string;
};

const DEFAULT_ALT =
  "Blue Ridge timeline illustration — Carolina Futons company milestones from 1991 to present";

export function BlueRidgeTimeline({
  alt = DEFAULT_ALT,
  className,
}: BlueRidgeTimelineProps) {
  return (
    <div
      data-slot="blue-ridge-timeline"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
    >
      <Image
        src="/illustrations/blue-ridge-timeline.svg"
        alt={alt}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="h-auto w-full"
        priority={false}
      />
    </div>
  );
}

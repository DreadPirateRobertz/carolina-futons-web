import { AboutIllustrationClient } from "@/components/illustrations/AboutIllustrationClient";
import { TEAM_PORTRAIT_SVG_BODY } from "@/lib/illustrations/about-illustrations-svg";

// cf-about-illus: Team portrait scene (900×500) — three hand-illustrated
// family photo frames in rustic wood before layered Blue Ridge mountains at
// golden hour. The <title> embedded in the SVG body provides the accessible
// name for screen readers via the role="img" on the <svg>.

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 500;

export type TeamPortraitProps = {
  className?: string;
};

export function TeamPortrait({ className }: TeamPortraitProps) {
  return (
    <div
      data-slot="team-portrait"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
    >
      <AboutIllustrationClient
        svgBody={TEAM_PORTRAIT_SVG_BODY}
        viewWidth={VIEW_WIDTH}
        viewHeight={VIEW_HEIGHT}
      />
    </div>
  );
}

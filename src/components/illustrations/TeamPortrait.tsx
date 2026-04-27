import { AboutIllustrationClient } from "@/components/illustrations/AboutIllustrationClient";
import { TEAM_PORTRAIT_SVG_BODY } from "@/lib/illustrations/about-illustrations-svg";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 500;

export type TeamPortraitProps = {
  className?: string;
};

export function TeamPortrait({ className }: TeamPortraitProps) {
  return (
    <div data-slot="team-portrait" className={className}>
      <AboutIllustrationClient
        svgBody={TEAM_PORTRAIT_SVG_BODY}
        viewWidth={VIEW_WIDTH}
        viewHeight={VIEW_HEIGHT}
        titleId="title-team-portrait"
      />
    </div>
  );
}

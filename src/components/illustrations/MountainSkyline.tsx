import Image from "next/image";

// cf-93rb Phase A. Section divider variant — taller than the footer
// silhouette (1440×200) and meant to anchor headers/section breaks.
// Decorative; consumers that need a meaningful skyline use <LivingSky />.

const SVG_WIDTH = 1440;
const SVG_HEIGHT = 200;

export function MountainSkyline({ className }: { className?: string }) {
  return (
    <div
      data-slot="mountain-skyline"
      aria-hidden="true"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
    >
      <Image
        src="/illustrations/mountain-skyline.svg"
        alt=""
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="h-auto w-full"
        priority={false}
      />
    </div>
  );
}

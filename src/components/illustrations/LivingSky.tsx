import Image from "next/image";

// cf-93rb Phase A. Atmospheric Blue Ridge skyline band for the home hero.
// The source SVG (1040×150, role="img" with title/desc) is meaningful
// content — the title is "Blue Ridge mountain skyline — living time-of-day"
// and a screen-reader user benefits from knowing the band is there. We
// pass an explicit alt so next/image emits it on the rendered <img>.

const SVG_WIDTH = 1040;
const SVG_HEIGHT = 150;

export type LivingSkyProps = {
  // Override only when the consumer needs a more specific description for
  // its placement (e.g. "Blue Ridge skyline above the press band"). Default
  // matches the source SVG's <title>.
  alt?: string;
  className?: string;
};

const DEFAULT_ALT = "Blue Ridge mountain skyline";

export function LivingSky({
  alt = DEFAULT_ALT,
  className,
}: LivingSkyProps) {
  return (
    <div
      data-slot="living-sky"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
    >
      <Image
        src="/illustrations/living-sky.svg"
        alt={alt}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="h-auto w-full"
        priority={false}
      />
    </div>
  );
}

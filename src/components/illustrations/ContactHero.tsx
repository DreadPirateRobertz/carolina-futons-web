import Image from "next/image";

// cf-93rb Phase A. Sunrise mountain band for the /contact hero. Source SVG
// (1440×220) carries a <title> describing the scene; passing it through
// next/image's alt keeps the description in the rendered <img>.

const SVG_WIDTH = 1440;
const SVG_HEIGHT = 220;

export type ContactHeroProps = {
  alt?: string;
  className?: string;
};

const DEFAULT_ALT =
  "Blue Ridge mountain skyline at sunrise — layered ridgelines fading into warm morning haze";

export function ContactHero({
  alt = DEFAULT_ALT,
  className,
}: ContactHeroProps) {
  return (
    <div
      data-slot="contact-hero"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
    >
      <Image
        src="/illustrations/contact-hero.svg"
        alt={alt}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        className="h-auto w-full"
        priority={false}
      />
    </div>
  );
}

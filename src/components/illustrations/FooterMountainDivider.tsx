import Image from "next/image";

// cf-93rb Phase A. Decorative ridge silhouette that sits above the dark
// footer chrome — the original SVG (1440×80, preserveAspectRatio="none")
// is built to stretch full-width over any container. aria-hidden so it
// stays out of the AT tree; the footer's content already conveys the
// site's identity.

const SVG_WIDTH = 1440;
const SVG_HEIGHT = 80;

export function FooterMountainDivider() {
  return (
    <div
      data-slot="footer-mountain-divider"
      aria-hidden="true"
      className="pointer-events-none w-full select-none leading-none"
    >
      <Image
        src="/illustrations/footer-mountain-divider.svg"
        alt=""
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        // Next/image with width+height preserves aspect ratio by default;
        // overriding with w-full + h-auto lets the SVG fluidly span the
        // viewport like the source viewBox intends.
        className="h-auto w-full"
        priority={false}
      />
    </div>
  );
}

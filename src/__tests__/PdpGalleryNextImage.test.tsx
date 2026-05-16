/**
 * cf-h345 Track 2 — Tests for PdpGallery next/image swap.
 *
 * STUB FILE — bodies fill in once cf-h345.t3.impl ships. See
 * docs/design/cf-h345-t3-pdp-nextimage-design.md for the full design.
 *
 * Contract pinned by these stubs:
 *   1. Main image renders as next/image (not <img>) — verifiable via
 *      data-next-img attribute or img component identity
 *   2. priority prop is true for the LCP candidate
 *   3. width/height are explicit (1200/1200 for 2× retina at 600px CSS)
 *   4. sizes attribute set for responsive srcset selection
 *   5. Raw Wix URL passed (no wixImageUrl wrapper); URL contains
 *      static.wixstatic.com/media path
 *   6. framer scale style applies to WRAPPER (m.div), not Image
 *   7. framer crossfade props (initial/animate/transition) apply to
 *      WRAPPER, not Image
 *   8. viewTransitionName applies to WRAPPER, not Image
 */
import { describe, it } from "vitest";

describe.skip("PdpGallery main image — cf-h345 Track 2 next/image (DESIGN STUB)", () => {
  it("renders main image as Next.js <Image>, not bare <img>");

  it("Image has priority={true} for LCP candidate");

  it("Image has explicit width/height (1200/1200 retina target)");

  it("Image has sizes attribute for responsive srcset");

  it("Image src is the RAW Wix URL (no wixImageUrl pre-resize wrapper)");

  it("framer scale applies to the wrapper m.div, not the Image");

  it("framer crossfade (initial/animate/transition) applies to wrapper");

  it("viewTransitionName applies to wrapper when carryVTName=true");
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PdpGallery } from "@/components/product/PdpGallery";

type FakeViewTransition = {
  finished: Promise<undefined>;
  skipTransition: ReturnType<typeof vi.fn>;
};

function installViewTransitionStub(
  impl?: (cb: () => void) => FakeViewTransition,
) {
  const skips: Array<FakeViewTransition["skipTransition"]> = [];
  const defaultImpl = (cb: () => void): FakeViewTransition => {
    cb();
    const skip = vi.fn();
    skips.push(skip);
    return {
      finished: new Promise<undefined>(() => {}),
      skipTransition: skip,
    };
  };
  const startVT = vi.fn(impl ?? defaultImpl);
  Object.defineProperty(document, "startViewTransition", {
    value: startVT,
    configurable: true,
    writable: true,
  });
  return { startVT, skips };
}

function uninstallViewTransitionStub() {
  // Reset to undefined so other suites see an unsupported environment.
  Object.defineProperty(document, "startViewTransition", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn<() => boolean | null>(() => false),
  useScroll: vi.fn(() => ({ scrollYProgress: { __isMotionValue: true } })),
  useTransform: vi.fn(
    (
      _value: unknown,
      _input: ReadonlyArray<number>,
      _output: ReadonlyArray<number>,
    ) => ({ __scaleMotionValue: true }),
  ),
}));

vi.mock("framer-motion", () => ({
  m: { div: "div", img: "img" },
  useReducedMotion: motionMocks.useReducedMotion,
  useScroll: motionMocks.useScroll,
  useTransform: motionMocks.useTransform,
}));

const multiImages = [
  { url: "https://img/a.jpg", alt: "Front" },
  { url: "https://img/b.jpg", alt: "Side" },
  { url: "https://img/c.jpg", alt: "Detail" },
];

describe("PdpGallery", () => {
  it("renders the first image as the main image by default", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
    expect(main.alt).toBe("Front");
  });

  it("renders a thumb for each image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    expect(thumbs).toHaveLength(3);
  });

  it("swaps the main image when a thumb is clicked", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
    expect(thumbs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("swaps main image when a thumb is clicked even when activeUrl is set (cf-t2xo)", () => {
    // Regression: when activeUrl was set, index was re-derived from activeUrl
    // on every render, so setSelectedIndex(next) had no visible effect.
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/a.jpg"
      />,
    );
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("resets to the new activeUrl when activeUrl prop changes (variant switch)", () => {
    const { rerender } = render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/a.jpg"
      />,
    );
    // User clicks thumb 2
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    expect((screen.getByTestId("pdp-main-image") as HTMLImageElement).src).toBe("https://img/b.jpg");
    // Variant picker selects a variant whose main image is img/c.jpg
    rerender(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/c.jpg"
      />,
    );
    expect((screen.getByTestId("pdp-main-image") as HTMLImageElement).src).toBe("https://img/c.jpg");
  });

  it("arrow-right advances to the next thumb", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("arrow-left wraps back to the last thumb from the first", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/c.jpg");
  });

  it("arrow-right wraps forward from the last thumb to the first", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
  });

  it("uses productName as the alt when an image has no alt", () => {
    render(
      <PdpGallery
        images={[{ url: "https://img/x.jpg" }]}
        productName="Kingston Futon"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.alt).toBe("Kingston Futon");
  });

  it("renders the single main image and no tablist when only one image is supplied", () => {
    render(
      <PdpGallery
        images={[{ url: "https://img/only.jpg" }]}
        productName="Kingston Futon"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/only.jpg");
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("renders the empty-state placeholder when images is empty", () => {
    render(<PdpGallery images={[]} productName="Kingston Futon" />);
    expect(screen.queryByTestId("pdp-main-image")).toBeNull();
    expect(screen.getByTestId("pdp-gallery-empty")).toBeInTheDocument();
  });

  it("thumb has aria-label announcing position for screen readers", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    expect(thumbs[0].getAttribute("aria-label")).toMatch(/1 of 3/);
    expect(thumbs[2].getAttribute("aria-label")).toMatch(/3 of 3/);
  });

  // Wraps the main image in a scroll-driven zoom container. The wrapper div
  // has overflow-hidden so the zoom doesn't bleed outside the gallery
  // footprint; the testid stays on the inner img so existing assertions
  // still pass.
  it("wraps the main image in an overflow-hidden zoom container", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image");
    const zoomContainer = main.parentElement;
    expect(zoomContainer).not.toBeNull();
    expect(zoomContainer!.className).toMatch(/overflow-hidden/);
  });
});

// WCAG 2.3.3 (Animation from Interactions, AAA) — when the user has set
// prefers-reduced-motion, the scroll-driven scale must be suppressed
// entirely. These tests stub framer-motion so we can flip useReducedMotion
// and inspect the rendered style + the scale curve we hand to useTransform.
describe("PdpGallery — prefers-reduced-motion", () => {
  beforeEach(() => {
    motionMocks.useReducedMotion.mockReset();
    motionMocks.useTransform.mockClear();
  });

  it("omits the scale style entirely when prefers-reduced-motion is set", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    // No transform, no scale — byte-for-byte static.
    expect(main.style.transform).toBe("");
    expect(main.getAttribute("style") ?? "").not.toMatch(/scale/);
  });

  it("applies the scale MotionValue when prefers-reduced-motion is unset", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    // useTransform is what produces the scale MotionValue; if we ran it,
    // the reduce branch was not taken and the style was wired through.
    expect(motionMocks.useTransform).toHaveBeenCalled();
  });

  it("uses a peak-and-return scale curve capped at 1.05", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(motionMocks.useTransform).toHaveBeenCalledWith(
      expect.anything(),
      [0, 0.5, 1],
      [1, 1.05, 1],
    );
  });

  it("does NOT apply framer crossfade props to the main image when reduce=true (cf-3qt.7.M.FIX.2)", () => {
    // useFramerCrossfade = !supportsVT && !reduce. No VT stub is installed
    // here, so supportsVT=false; with reduce=true the spread must be empty,
    // meaning the rendered <img> has no initial/animate attributes. This
    // closes the last reduce-path contract for ZoomMainImage: both the
    // scroll scale AND the swap crossfade are off under reduced-motion.
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.getAttribute("initial")).toBeNull();
    expect(main.getAttribute("animate")).toBeNull();
    expect(main.getAttribute("transition")).toBeNull();
  });
});

// cf-3qt.7.O.1: View Transitions API for thumb→main image swap.
// Browser-native morph in Chromium 111+/Safari 18+; framer crossfade falls
// back for older browsers; reduced-motion = instant swap with no transition.
describe("PdpGallery — View Transitions API", () => {
  beforeEach(() => {
    motionMocks.useReducedMotion.mockReset();
    motionMocks.useReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    uninstallViewTransitionStub();
  });

  it("calls document.startViewTransition when the API is supported", () => {
    const { startVT } = installViewTransitionStub();
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    expect(startVT).toHaveBeenCalledTimes(1);
    // The new image is committed inside the transition callback.
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("falls back to direct state update when the API is unavailable", () => {
    // Don't install — startViewTransition stays undefined for this test.
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("skips the View Transitions path when prefers-reduced-motion is set", () => {
    const { startVT } = installViewTransitionStub();
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    // WCAG 2.3.3: reduced-motion users get an instant swap, no animation —
    // the API is gated behind both feature support AND the reduce flag.
    expect(startVT).not.toHaveBeenCalled();
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("cancels the in-flight transition with skipTransition on rapid click", () => {
    const { startVT, skips } = installViewTransitionStub();
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    fireEvent.click(thumbs[2]);
    // Two transitions started; the first one was skipped when the second
    // click landed (prevents queue/lag on rapid clicks).
    expect(startVT).toHaveBeenCalledTimes(2);
    expect(skips[0]).toHaveBeenCalledTimes(1);
    expect(skips[1]).not.toHaveBeenCalled();
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/c.jpg");
  });

  // cf-bq1q: miquella silent-failure-hunter P2. `.finished` rejects on
  // cancel/abort; a bare `.finally` would swallow the rejection and surface
  // as an unhandled-rejection warning in devtools + Sentry. The fix chains
  // `.catch(logBreadcrumb).finally(cleanup)` — breadcrumb fires, cleanup
  // still runs.
  it("swallows a `.finished` rejection via .catch and still runs cleanup", async () => {
    let rejectFinished: ((reason: unknown) => void) | undefined;
    const rejectingImpl = (cb: () => void) => {
      cb();
      return {
        finished: new Promise<undefined>((_resolve, reject) => {
          rejectFinished = reject;
        }),
        skipTransition: vi.fn(),
      };
    };
    installViewTransitionStub(rejectingImpl);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unhandledSpy = vi.fn();
    const originalOnUnhandled = window.onunhandledrejection;
    window.addEventListener("unhandledrejection", unhandledSpy);

    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);

    rejectFinished?.(new Error("vt aborted"));
    // Flush microtasks so the .catch handler runs before assertions.
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pdp-gallery"),
      expect.any(Error),
    );
    // The .catch eats the rejection so no unhandled-rejection fires.
    expect(unhandledSpy).not.toHaveBeenCalled();

    window.removeEventListener("unhandledrejection", unhandledSpy);
    window.onunhandledrejection = originalOnUnhandled;
    warnSpy.mockRestore();
  });
});

describe("PdpGallery — onError / broken image fallback", () => {
  beforeEach(() => uninstallViewTransitionStub());

  it("main image falls back to FALLBACK data URI on load error", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    expect(main.src).toMatch(/^data:image\/png/);
    warnSpy.mockRestore();
  });

  it("main image onError logs console.warn with the original broken src", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PdpGallery]"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
  });

  it("second error on same image logs console.error (fallback also failed)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    fireEvent.error(main); // fallback also errored
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PdpGallery] fallback"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("thumbnail image falls back on load error", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const thumbImgs = container.querySelectorAll(
      "[role='tab'] img",
    ) as NodeListOf<HTMLImageElement>;
    fireEvent.error(thumbImgs[1]);
    expect(thumbImgs[1].src).toMatch(/^data:image\/png/);
    warnSpy.mockRestore();
  });

  it("thumbnail onError logs warn with the correct broken src and context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const thumbImgs = container.querySelectorAll(
      "[role='tab'] img",
    ) as NodeListOf<HTMLImageElement>;
    fireEvent.error(thumbImgs[0]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("thumb 0"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
  });
});

// cfw-zd8: wiring the GalleryZoomLightbox into the gallery. Three cases
// pinned down: main image renders, clicking it opens the overlay, ESC on
// the open overlay closes it. Detailed lightbox behavior (zoom, pan, swipe,
// keyboard nav, focus trap) lives in GalleryZoomLightbox.test.tsx.
describe("PdpGallery — gallery zoom lightbox (cfw-zd8)", () => {
  it("renders the main image (zoom entry-point source of truth)", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
  });

  it("clicking the main image opens the full-screen lightbox dialog", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const trigger = screen.getByTestId("pdp-main-image-zoom-trigger");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("ESC closes an open lightbox", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    fireEvent.click(screen.getByTestId("pdp-main-image-zoom-trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// cf-q9zi (QA pass): activeUrl prop lets the variant picker drive the gallery.
// These cases are the regression target: variant selection in PdpInteractive
// updates `activeUrl`, and the gallery must reflect the new active image even
// when the user has also clicked a thumb manually.
describe("PdpGallery — activeUrl variant-picker integration (cf-q9zi)", () => {
  beforeEach(() => uninstallViewTransitionStub());

  it("shows the image matching activeUrl as the main image, not the first image", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/b.jpg"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    const thumbs = screen.getAllByRole("tab");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
    expect(thumbs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("updates the main image when activeUrl changes (variant re-selection)", () => {
    const { rerender } = render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/a.jpg"
      />,
    );
    rerender(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/c.jpg"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/c.jpg");
  });

  // cf-pdp-g2: when the variant-resolved URL isn't in `images` (e.g. Wix
  // catalogs that attach swatch media at the variant level, not the choice
  // level, and the gallery build didn't fold variant media in), the main
  // image MUST still swap to that URL — falling back to `images[0]` made
  // the variant selection appear to do nothing, which is the parity bug
  // rennala caught in cf-lc1c PDP audit.
  it("renders activeUrl as the main image even when it is NOT in images (cf-pdp-g2)", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/variant-only.jpg"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/variant-only.jpg");
  });

  // cf-pdp-g2.fu2 (blaidd parity-audit note): screen readers need the
  // variant-specific alt text, not the product-level default, when
  // activeUrl drives a synthetic main image outside the gallery.
  it("uses activeAlt for the synthetic main image when activeUrl is not in images", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/variant-only.jpg"
        activeAlt="Kingston Futon — Color: Bryan Charcoal"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.alt).toBe("Kingston Futon — Color: Bryan Charcoal");
  });

  it("falls back to productName for the synthetic main alt when activeAlt is omitted", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/variant-only.jpg"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.alt).toBe("Kingston Futon");
  });

  it("activeAlt does NOT override the alt of an indexed image (activeUrl in images)", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/b.jpg"
        activeAlt="Kingston Futon — Color: Bryan Charcoal"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    // When the gallery has the image, the in-gallery alt wins so the
    // catalog-authored copy isn't replaced by a synthetic variant label.
    expect(main.alt).toBe("Side");
  });

  it("updates main image when activeUrl changes to a non-gallery URL (cf-pdp-g2)", () => {
    const { rerender } = render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/a.jpg"
      />,
    );
    rerender(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/variant-only-2.jpg"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/variant-only-2.jpg");
  });

  it("falls back to images[0] when activeUrl is undefined and no thumb has been clicked", () => {
    render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
  });

  // cf-pdp-g3: when the variant-resolved activeUrl is rendered as the main
  // image but NOT present in the gallery `images` array (cf-pdp-g2 path),
  // the GalleryZoomLightbox MUST open onto that same variant image — not
  // on `images[0]`. Pre-fix, the lightbox built its image array from raw
  // `images.map(...)` so opening zoom on a variant-only URL silently
  // zoomed into the wrong product photo. Validated visually during
  // rennala's cf-lc1c follow-up.
  it("zoom modal opens onto activeUrl when activeUrl is not in images (cf-pdp-g3)", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/variant-only.jpg"
      />,
    );
    fireEvent.click(screen.getByTestId("pdp-main-image-zoom-trigger"));
    const zoomed = screen.getByTestId("gallery-zoom-image") as HTMLImageElement;
    expect(zoomed.src).toBe("https://img/variant-only.jpg");
  });

  it("activeUrl from parent overrides a previous thumb click", () => {
    const { rerender } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    // User clicks the third thumb
    fireEvent.click(screen.getAllByRole("tab")[2]);
    expect(
      (screen.getByTestId("pdp-main-image") as HTMLImageElement).src,
    ).toBe("https://img/c.jpg");
    // Variant picker drives a different image via activeUrl
    rerender(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        activeUrl="https://img/b.jpg"
      />,
    );
    expect(
      (screen.getByTestId("pdp-main-image") as HTMLImageElement).src,
    ).toBe("https://img/b.jpg");
  });
});

describe("PdpGallery — image comparison (cf-delight #10)", () => {
  it("shows a Compare button when there are ≥2 images", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(screen.getByTestId("pdp-compare-toggle")).toBeInTheDocument();
    expect(screen.getByLabelText(/compare two angles/i)).toBeInTheDocument();
  });

  it("clicking Compare replaces the main image with the comparison view", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(screen.queryByTestId("pdp-image-comparison")).toBeNull();
    fireEvent.click(screen.getByTestId("pdp-compare-toggle"));
    expect(screen.getByTestId("pdp-image-comparison")).toBeInTheDocument();
    expect(screen.queryByTestId("pdp-main-image-zoom-trigger")).toBeNull();
  });

  it("clicking Compare again (or closing) restores the normal gallery", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    fireEvent.click(screen.getByTestId("pdp-compare-toggle"));
    expect(screen.getByTestId("pdp-image-comparison")).toBeInTheDocument();
    // Close via the comparison close button
    fireEvent.click(screen.getByRole("button", { name: /close comparison/i }));
    expect(screen.queryByTestId("pdp-image-comparison")).toBeNull();
    expect(screen.getByTestId("pdp-main-image-zoom-trigger")).toBeInTheDocument();
  });

  it("does not show Compare button for a single-image gallery", () => {
    render(<PdpGallery images={[multiImages[0]!]} productName="Kingston Futon" />);
    expect(screen.queryByTestId("pdp-compare-toggle")).toBeNull();
  });
});

// cfw-x3w: 360°-spin viewer toggle on the gallery. Static gallery is the
// initial render path so LCP and CLS are unaffected; the user opts in.
describe("PdpGallery — 360 spin toggle (cfw-x3w)", () => {
  const SPIN_FRAMES = Array.from({ length: 12 }, (_, i) => `https://cdn/spin-${i}.jpg`);

  it("does not render the spin toggle when spinImages is empty/undefined", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(screen.queryByTestId("pdp-spin-toggle")).toBeNull();
  });

  it("renders the 360 toggle when spinImages are provided", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    expect(screen.getByTestId("pdp-spin-toggle")).toBeInTheDocument();
  });

  it("starts on the static gallery — spin viewer hidden by default (no CLS)", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    expect(screen.getByTestId("pdp-main-image-zoom-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("product-spin-viewer")).toBeNull();
  });

  it("clicking the toggle swaps the static main image for the spin viewer", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    fireEvent.click(screen.getByTestId("pdp-spin-toggle"));
    expect(screen.getByTestId("product-spin-viewer")).toBeInTheDocument();
    expect(screen.queryByTestId("pdp-main-image-zoom-trigger")).toBeNull();
  });

  it("clicking the toggle a second time returns to the static gallery", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    fireEvent.click(screen.getByTestId("pdp-spin-toggle"));
    fireEvent.click(screen.getByTestId("pdp-spin-toggle"));
    expect(screen.getByTestId("pdp-main-image-zoom-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("product-spin-viewer")).toBeNull();
  });

  it("opening spin viewer closes the comparison view (mutually exclusive)", () => {
    render(
      <PdpGallery
        images={multiImages}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    fireEvent.click(screen.getByTestId("pdp-compare-toggle"));
    expect(screen.getByTestId("pdp-image-comparison")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pdp-spin-toggle"));
    expect(screen.queryByTestId("pdp-image-comparison")).toBeNull();
    expect(screen.getByTestId("product-spin-viewer")).toBeInTheDocument();
  });

  it("toggle still appears for a single-image gallery when spin frames exist", () => {
    render(
      <PdpGallery
        images={[multiImages[0]!]}
        productName="Kingston Futon"
        spinImages={SPIN_FRAMES}
      />,
    );
    expect(screen.getByTestId("pdp-spin-toggle")).toBeInTheDocument();
  });
});

// Pins the logError migration so an accidental revert to a bare
// console.error("[PdpGallery] …") (or to a non-bracketed prefix that
// bypasses the helper) fails loudly. Asserts on the console.error sink
// because logError forwards there in every env; the Sentry forwarder is
// prod-only and unit-tested in log.test.ts.
describe("PdpGallery — logError migration", () => {
  it("emits a bracketed '[PdpGallery] fallback also failed for broken src (main)' prefix when the main image's fallback also fails", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    fireEvent.error(main);
    // Exact first arg: scope + message joined by the helper, including the
    // interpolated context tag so onError diagnostics still localize.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]![0]).toBe(
      "[PdpGallery] fallback also failed for broken src (main)",
    );
    expect(errorSpy.mock.calls[0]![1]).toBe("https://img/a.jpg");
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("emits the same prefix shape with an indexed 'thumb' context when a thumbnail's fallback also fails", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const thumbImgs = container.querySelectorAll(
      "[role='tab'] img",
    ) as NodeListOf<HTMLImageElement>;
    fireEvent.error(thumbImgs[1]);
    fireEvent.error(thumbImgs[1]); // fallback also errored
    expect(errorSpy).toHaveBeenCalledWith(
      "[PdpGallery] fallback also failed for broken src (thumb 1)",
      "https://img/b.jpg",
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("passes the URL through unchanged as the second arg (no JSON.stringify, no Error-wrap)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    fireEvent.error(main);
    // Second arg must be the raw URL string — the helper accepts `unknown`
    // for `err`, but here we want a plain string so log scrapers can pull
    // the URL out without unwrapping an Error object.
    const secondArg = errorSpy.mock.calls.at(-1)![1];
    expect(typeof secondArg).toBe("string");
    expect(secondArg).toBe("https://img/a.jpg");
    expect(secondArg).not.toBeInstanceOf(Error);
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

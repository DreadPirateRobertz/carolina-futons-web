/**
 * cf-h345.t3 — PdpGallery main image uses next/image with the contract
 * defined in docs/design/cf-h345-t3-pdp-nextimage-design.md.
 *
 * Complements the broader PdpGallery.test.tsx behavioral suite — that
 * one mocks next/image as a plain passthrough so existing 51 cases
 * keep working. THIS file inspects WHAT PROPS PdpGallery actually
 * passes to next/image, captured by a recording mock.
 *
 * Contract pinned:
 *   1. Main image is rendered via next/image (recorded by mock)
 *   2. priority={true} — LCP candidate browser-hint triple
 *   3. width/height = 1200/1200 (2× retina target for 600px CSS)
 *   4. sizes attribute set for responsive srcset selection
 *   5. Raw Wix URL passed (no wixImageUrl pre-resize wrapper)
 *   6. data-testid='pdp-main-image' preserved on the Image
 *   7. framer scale style applies to WRAPPER (m.div), not Image
 *   8. framer crossfade (initial/animate/transition) applies to wrapper
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

import { PdpGallery } from "@/components/product/PdpGallery";

const imageCalls: Array<Record<string, unknown>> = [];
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    imageCalls.push(props);
    return (
      <img
        src={props.src as string}
        alt={props.alt as string}
        data-testid={props["data-testid"] as string}
      />
    );
  },
}));

const motionMocks = vi.hoisted(() => {
  const wrapperCalls: Array<Record<string, unknown>> = [];
  return {
    wrapperCalls,
    useReducedMotion: vi.fn<() => boolean | null>(() => false),
    useScroll: vi.fn(() => ({ scrollYProgress: { __isMotionValue: true } })),
    useTransform: vi.fn(
      (
        _value: unknown,
        _input: ReadonlyArray<number>,
        _output: ReadonlyArray<number>,
      ) => ({ __scaleMotionValue: true }),
    ),
  };
});

vi.mock("framer-motion", () => ({
  // m.div records its props so we can introspect the wrapper. m.img is
  // kept as plain `img` for any residual non-main-image usage.
  m: {
    div: (props: Record<string, unknown>) => {
      motionMocks.wrapperCalls.push(props);
      return (
        <div className={props.className as string}>
          {props.children as ReactNode}
        </div>
      );
    },
    img: "img",
  },
  useReducedMotion: motionMocks.useReducedMotion,
  useScroll: motionMocks.useScroll,
  useTransform: motionMocks.useTransform,
}));

const multiImages = [
  { url: "https://static.wixstatic.com/media/abc.jpg", alt: "Front" },
  { url: "https://static.wixstatic.com/media/def.jpg", alt: "Side" },
];

beforeEach(() => {
  imageCalls.length = 0;
  motionMocks.wrapperCalls.length = 0;
  motionMocks.useReducedMotion.mockReturnValue(false);
});

describe("PdpGallery — cf-h345.t3 next/image contract", () => {
  it("renders the main image via next/image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    // imageCalls captures props passed to next/image; if PdpGallery
    // used a bare <img> instead, this array would be empty.
    expect(imageCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("passes priority={true} on the LCP-candidate main image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    expect(imageCalls[0].priority).toBe(true);
  });

  it("passes explicit width={1200} and height={1200} (2x retina target)", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    expect(imageCalls[0].width).toBe(1200);
    expect(imageCalls[0].height).toBe(1200);
  });

  it("passes sizes attribute for responsive srcset", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    expect(imageCalls[0].sizes).toMatch(/100vw|768px|600px/);
  });

  it("passes the RAW Wix URL (no wixImageUrl pre-resize wrapper)", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    // wixImageUrl rewrites /media/ → /v1/<mode>/.../media/. A raw URL
    // does NOT contain '/v1/' before the host's '/media/' path.
    expect(imageCalls[0].src).toBe("https://static.wixstatic.com/media/abc.jpg");
    expect(imageCalls[0].src).not.toMatch(/\/v1\//);
  });

  it("preserves data-testid='pdp-main-image' on the Image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    expect(imageCalls[0]["data-testid"]).toBe("pdp-main-image");
  });

  it("framer scale style applies to the wrapper m.div, not the Image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    // Find the main-image wrapper by its distinctive className.
    const mainWrapperCall = motionMocks.wrapperCalls.find((call) =>
      String(call.className ?? "").includes("aspect-square w-full"),
    );
    expect(mainWrapperCall).toBeDefined();
    expect(mainWrapperCall!.style).toBeDefined();
  });

  it("framer crossfade props (initial/animate/transition) live on wrapper, NOT Image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston" />);
    // The Image props captured in imageCalls[0] should NOT carry the
    // framer animation props — those land on the wrapper.
    expect(imageCalls[0].initial).toBeUndefined();
    expect(imageCalls[0].animate).toBeUndefined();
    expect(imageCalls[0].transition).toBeUndefined();
  });
});

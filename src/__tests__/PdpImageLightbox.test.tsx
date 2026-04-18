import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// cf-nmwy: PDP full-screen image zoom lightbox. ESC + click-outside
// dismiss. Reduced-motion skips the crossfade.

const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn<() => boolean | null>(() => false),
  divCalls: [] as Array<{
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
  }>,
}));

vi.mock("framer-motion", () => ({
  m: {
    div: ({
      children,
      initial,
      animate,
      transition,
      ...rest
    }: {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    } & Record<string, unknown>) => {
      motionMocks.divCalls.push({ initial, animate, transition });
      return <div {...rest}>{children}</div>;
    },
  },
  useReducedMotion: motionMocks.useReducedMotion,
}));

beforeEach(() => {
  motionMocks.divCalls = [];
  motionMocks.useReducedMotion.mockReturnValue(false);
});

import { PdpImageLightbox } from "@/components/product/PdpImageLightbox";

const DEFAULTS = {
  src: "https://example.com/product.jpg",
  alt: "Monterey futon frame",
};

describe("PdpImageLightbox — open/closed", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <PdpImageLightbox {...DEFAULTS} open={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a modal dialog when open=true", () => {
    render(<PdpImageLightbox {...DEFAULTS} open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toContain("Monterey futon frame");
  });

  it("renders the image with the provided src + alt", () => {
    render(<PdpImageLightbox {...DEFAULTS} open onClose={() => {}} />);
    const img = screen.getByTestId("pdp-lightbox-image");
    expect(img.getAttribute("src")).toBe(DEFAULTS.src);
    expect(img.getAttribute("alt")).toBe(DEFAULTS.alt);
  });
});

describe("PdpImageLightbox — dismissal", () => {
  it("invokes onClose when ESC is pressed", () => {
    const onClose = vi.fn();
    render(<PdpImageLightbox {...DEFAULTS} open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke onClose when a non-ESC key is pressed", () => {
    const onClose = vi.fn();
    render(<PdpImageLightbox {...DEFAULTS} open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("invokes onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<PdpImageLightbox {...DEFAULTS} open onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke onClose when the image itself is clicked (bubbles but target is image)", () => {
    const onClose = vi.fn();
    render(<PdpImageLightbox {...DEFAULTS} open onClose={onClose} />);
    const img = screen.getByTestId("pdp-lightbox-image");
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("invokes onClose when the explicit close button is activated", () => {
    const onClose = vi.fn();
    render(<PdpImageLightbox {...DEFAULTS} open onClose={onClose} />);
    const closeBtn = screen.getByRole("button", { name: /close image viewer/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes the ESC listener when closed (no stale handler after unmount)", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <PdpImageLightbox {...DEFAULTS} open onClose={onClose} />,
    );
    rerender(<PdpImageLightbox {...DEFAULTS} open={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("PdpImageLightbox — reduced-motion", () => {
  it("omits initial/animate/transition under reduced-motion (no crossfade)", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpImageLightbox {...DEFAULTS} open onClose={() => {}} />);
    expect(motionMocks.divCalls[0].initial).toBeUndefined();
    expect(motionMocks.divCalls[0].animate).toBeUndefined();
    expect(motionMocks.divCalls[0].transition).toBeUndefined();
  });

  it("applies the crossfade props under normal motion", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<PdpImageLightbox {...DEFAULTS} open onClose={() => {}} />);
    expect(motionMocks.divCalls[0].initial).toEqual({ opacity: 0 });
    expect(motionMocks.divCalls[0].animate).toEqual({ opacity: 1 });
  });

  it("tags the overlay with data-reduced-motion for CSS + test introspection", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpImageLightbox {...DEFAULTS} open onClose={() => {}} />);
    expect(screen.getByRole("dialog").getAttribute("data-reduced-motion")).toBe("1");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-3qt.16.1: Footer animation contract — motion.div float + useReducedMotion guard.
// Covers: (1) MascotFooterDivider present in footer DOM; (2) animate prop active
// when reduced motion is off; (3) animate prop suppressed when reduced motion is on.

const mocks = vi.hoisted(() => ({
  prefersReducedMotion: false as boolean | null,
  capturedAnimate: undefined as unknown,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      animate,
      transition: _t,
      children,
      ...rest
    }: {
      animate?: unknown;
      transition?: unknown;
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      mocks.capturedAnimate = animate;
      return (
        <div data-testid="motion-div" {...rest}>
          {children}
        </div>
      );
    },
  },
  useReducedMotion: () => mocks.prefersReducedMotion,
}));

vi.mock("@/components/mascot/MascotFooterDivider", () => ({
  MascotFooterDivider: ({ className }: { className?: string }) => (
    <div data-testid="mascot-footer-divider" className={className} />
  ),
}));

vi.mock("@/components/site/LivingFooterBg", () => ({
  LivingFooterBg: () => <div data-testid="living-footer-bg" />,
}));

vi.mock("@/components/site/NewsletterSignup", () => ({
  NewsletterSignup: () => <div data-testid="newsletter-signup" />,
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...rest }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...(rest as Record<string, unknown>)} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

import { Footer } from "@/components/site/Footer";

beforeEach(() => {
  mocks.prefersReducedMotion = false;
  mocks.capturedAnimate = undefined;
});

describe("Footer — MascotFooterDivider presence", () => {
  it("renders MascotFooterDivider inside the footer element", () => {
    render(<Footer />);
    expect(screen.getByTestId("mascot-footer-divider")).toBeInTheDocument();
  });

  it("MascotFooterDivider is a child of the motion.div wrapper", () => {
    render(<Footer />);
    const motionDiv = screen.getByTestId("motion-div");
    expect(
      motionDiv.querySelector("[data-testid='mascot-footer-divider']"),
    ).toBeInTheDocument();
  });
});

describe("Footer — animation active (reduced motion off)", () => {
  it("passes animate={{ y: [0,-6,0] }} when useReducedMotion returns false", () => {
    mocks.prefersReducedMotion = false;
    render(<Footer />);
    expect(mocks.capturedAnimate).toEqual({ y: [0, -6, 0] });
  });

  it("passes animate={{ y: [0,-6,0] }} when useReducedMotion returns null (SSR/unknown — defaults to animating)", () => {
    // null ?? false → false → animation is active.
    // The design is subtle enough that animating by default is safe.
    mocks.prefersReducedMotion = null;
    render(<Footer />);
    expect(mocks.capturedAnimate).toEqual({ y: [0, -6, 0] });
  });
});

describe("Footer — animation suppressed (reduced motion on)", () => {
  it("passes animate={undefined} when useReducedMotion returns true", () => {
    mocks.prefersReducedMotion = true;
    render(<Footer />);
    expect(mocks.capturedAnimate).toBeUndefined();
  });
});

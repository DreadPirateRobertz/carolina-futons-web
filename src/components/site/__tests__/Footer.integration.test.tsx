import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-3qt.16.4: Footer integration — structural rendering contract.
// Covers: data-slot presence, LivingFooterBg + MascotFooterDivider in DOM,
// motion.div aria-hidden, and footer content sections (logo, nav, contact).

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      animate: _a,
      transition: _t,
      children,
      ...rest
    }: {
      animate?: unknown;
      transition?: unknown;
      children?: ReactNode;
      [key: string]: unknown;
    }) => (
      <div data-testid="motion-div" {...rest}>
        {children}
      </div>
    ),
  },
  useReducedMotion: () => false,
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

function renderFooter() {
  return render(<Footer />);
}

describe("Footer — root element", () => {
  it("renders a footer element with data-slot='site-footer'", () => {
    const { container } = renderFooter();
    const footer = container.querySelector("[data-slot='site-footer']");
    expect(footer?.tagName.toLowerCase()).toBe("footer");
  });
});

describe("Footer — background and divider", () => {
  it("renders LivingFooterBg", () => {
    renderFooter();
    expect(screen.getByTestId("living-footer-bg")).toBeInTheDocument();
  });

  it("renders MascotFooterDivider", () => {
    renderFooter();
    expect(screen.getByTestId("mascot-footer-divider")).toBeInTheDocument();
  });

  it("motion.div wrapper has aria-hidden='true' (decorative — excluded from a11y tree)", () => {
    renderFooter();
    const motionDiv = screen.getByTestId("motion-div");
    expect(motionDiv).toHaveAttribute("aria-hidden", "true");
  });

  it("MascotFooterDivider is inside the aria-hidden motion.div", () => {
    renderFooter();
    const motionDiv = screen.getByTestId("motion-div");
    expect(
      within(motionDiv).getByTestId("mascot-footer-divider"),
    ).toBeInTheDocument();
  });
});

describe("Footer — logo and brand", () => {
  it("renders the Carolina Futons logo image", () => {
    renderFooter();
    expect(screen.getByAltText("Carolina Futons")).toBeInTheDocument();
  });

  it("renders the brand name as link text", () => {
    renderFooter();
    expect(screen.getByText("Carolina Futons")).toBeInTheDocument();
  });
});

describe("Footer — navigation columns", () => {
  it("renders the Shop nav column", () => {
    renderFooter();
    expect(screen.getByRole("navigation", { name: "Shop" })).toBeInTheDocument();
  });

  it("Shop column links to futon-frames and murphy beds", () => {
    renderFooter();
    const shopNav = screen.getByRole("navigation", { name: "Shop" });
    expect(
      within(shopNav).getByRole("link", { name: "Futon Frames" }),
    ).toHaveAttribute("href", "/shop/futon-frames");
    expect(
      within(shopNav).getByRole("link", { name: "Murphy Cabinet Beds" }),
    ).toHaveAttribute("href", "/shop/murphy-cabinet-beds");
  });

  it("renders the Info nav column", () => {
    renderFooter();
    expect(screen.getByRole("navigation", { name: "Info" })).toBeInTheDocument();
  });

  it("Info column includes Contact link", () => {
    renderFooter();
    const infoNav = screen.getByRole("navigation", { name: "Info" });
    expect(within(infoNav).getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});

describe("Footer — contact section", () => {
  it("renders the business phone number with Call/Text prefix", () => {
    renderFooter();
    expect(
      screen.getByText(/Call\/Text \(828\) 252-9449/),
    ).toBeInTheDocument();
  });

  it("renders the business email", () => {
    renderFooter();
    expect(screen.getByText("carolinafutons@gmail.com")).toBeInTheDocument();
  });

  it("renders the street address", () => {
    renderFooter();
    // Address has a <br /> after the street, so the <address> element's text
    // content spans multiple text nodes — use exact:false to match the substring.
    expect(screen.getByText(/824 Locust/, { exact: false })).toBeInTheDocument();
  });
});

describe("Footer — newsletter and bottom bar", () => {
  it("renders the newsletter signup widget", () => {
    renderFooter();
    expect(screen.getByTestId("newsletter-signup")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    renderFooter();
    const year = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`© ${year} Carolina Futons`)),
    ).toBeInTheDocument();
  });

  it("bottom bar has Privacy, Terms, and Accessibility links", () => {
    const { container } = renderFooter();
    const bottomBar = container.querySelector("[data-slot='site-footer-bottom']");
    expect(bottomBar).not.toBeNull();
    const links = within(bottomBar as HTMLElement).getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain("/terms");
    expect(hrefs).toContain("/accessibility");
  });
});

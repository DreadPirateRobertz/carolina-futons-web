import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { Footer, FOOTER_SOCIALS } from "@/components/site/Footer";
import { BUSINESS } from "@/lib/business/contact-info";

// Phase 3 rebrand: Footer now carries the brand identity (logo + tagline)
// + real contact data from the BUSINESS constant + social presence. The
// Phase 1 108px `h-cf-footer` chrome spec is intentionally retired here —
// the rebrand is content-driven and wraps to content height. Marketing
// owns the tagline + social URLs; the test suite pins exact strings so a
// silent drift surfaces as a failure.

describe("Footer — Phase 3 rebrand", () => {
  it("renders copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${year} Carolina Futons`)),
    ).toBeInTheDocument();
  });

  it("renders the CF logo from /brand/", () => {
    render(<Footer />);
    const logo = screen.getByAltText(/carolina futons/i);
    expect(logo).toBeInTheDocument();
    const src = logo.getAttribute("src") ?? "";
    // next/image rewrites /public assets through /_next/image. Both raw
    // and rewritten srcs should reference the brand square asset.
    expect(decodeURIComponent(src)).toContain("cf-logo-square");
  });

  it("renders the brand tagline", () => {
    render(<Footer />);
    expect(
      screen.getByText(/quality futon furniture since 1991/i),
    ).toBeInTheDocument();
  });

  it("renders BUSINESS.phone as a tel: link with Call/Text prefix", () => {
    render(<Footer />);
    const phone = screen.getByRole("link", {
      name: `Call/Text ${BUSINESS.phone}`,
    });
    expect(phone).toHaveAttribute("href", BUSINESS.phoneHref);
  });

  it("renders BUSINESS.email as a mailto: link", () => {
    render(<Footer />);
    const email = screen.getByRole("link", { name: BUSINESS.email });
    expect(email).toHaveAttribute("href", BUSINESS.emailHref);
  });

  it("renders the street address and hours block", () => {
    render(<Footer />);
    expect(
      screen.getByText(
        new RegExp(`${BUSINESS.street}.*${BUSINESS.city}.*${BUSINESS.state}`, "i"),
      ),
    ).toBeInTheDocument();
  });

  it("renders Shop / Info navigation columns", () => {
    render(<Footer />);
    ["Shop", "Info"].forEach((heading) => {
      expect(
        screen.getByRole("navigation", { name: heading }),
      ).toBeInTheDocument();
    });
  });

  it("renders footer Shop links with correct /shop/<slug> hrefs", () => {
    render(<Footer />);
    const shopNav = screen.getByRole("navigation", { name: "Shop" });
    const expected = [
      ["Futon Frames", "/shop/futon-frames"],
      ["Murphy Cabinet Beds", "/shop/murphy-cabinet-beds"],
      ["Mattresses", "/shop/mattresses"],
      ["Platform Beds", "/shop/platform-beds"],
    ] as const;
    for (const [label, href] of expected) {
      expect(within(shopNav).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("exposes legal/accessibility links in the bottom row", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: /accessibility/i }),
    ).toHaveAttribute("href", "/accessibility");
  });

  it("renders all four social links (Facebook, Instagram, TikTok, Pinterest)", () => {
    render(<Footer />);
    const expectedNames = ["Facebook", "Instagram", "TikTok", "Pinterest"];
    expect(FOOTER_SOCIALS.map((s) => s.name)).toEqual(expectedNames);
    for (const social of FOOTER_SOCIALS) {
      const link = screen.getByRole("link", {
        name: new RegExp(`${social.name}`, "i"),
      });
      expect(link).toHaveAttribute("href", social.href);
      expect(link.getAttribute("rel") ?? "").toContain("noopener");
      expect(link.getAttribute("target")).toBe("_blank");
    }
  });

  it("mounts the newsletter signup form (cf-newsletter-footer)", () => {
    render(<Footer />);
    expect(
      screen.getByRole("form", { name: /newsletter signup/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/stay in the loop/i)).toBeInTheDocument();
  });
});

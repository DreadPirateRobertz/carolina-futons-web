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

  it("renders the brand tagline (cf-n7ni: 'Quality futons since 1991')", () => {
    render(<Footer />);
    expect(
      screen.getByText(/quality futons since 1991/i),
    ).toBeInTheDocument();
  });

  // cfw-o2q: tagline + showroom hours flow from SiteContent via layout.tsx.
  // The component's default fallback covers Wix-down / unprovisioned cases;
  // these tests pin the override path that owner edits travel through.
  it("renders an owner-supplied tagline when passed via prop (cfw-o2q)", () => {
    render(<Footer tagline="Hardwood futons, built for life" />);
    expect(
      screen.getByText(/hardwood futons, built for life/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/quality futons since 1991/i),
    ).not.toBeInTheDocument();
  });

  it("renders an owner-supplied showroom hours label when passed via prop (cfw-o2q)", () => {
    render(
      <Footer showroomHoursLabel="Open by appointment · Mon–Sat" />,
    );
    expect(
      screen.getByText(/open by appointment · mon–sat/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/showroom hours: sun–tue, 10am–5pm/i),
    ).not.toBeInTheDocument();
  });

  it("falls back to default showroom hours when no prop is passed (cfw-o2q)", () => {
    render(<Footer />);
    expect(
      screen.getByText(/showroom hours: sun–tue, 10am–5pm/i),
    ).toBeInTheDocument();
  });

  // cf-n7ni: collapsed footer.copyright.suffix → footer.copyright-line. The
  // {year} placeholder is substituted with the current year at render so a
  // single Wix CMS edit covers the whole copyright string.
  it("renders an owner-supplied copyright line when passed via prop (cf-n7ni)", () => {
    render(
      <Footer copyrightLine="© {year} Carolina Futons LLC. Asheville, NC." />,
    );
    const year = new Date().getFullYear();
    expect(
      screen.getByText(
        new RegExp(`© ${year} Carolina Futons LLC\\. Asheville, NC\\.`),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        new RegExp(`© ${year} Carolina Futons\\. Hendersonville, NC\\.`),
      ),
    ).not.toBeInTheDocument();
  });

  it("falls back to default copyright line when no prop is passed (cf-n7ni)", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(
        new RegExp(`© ${year} Carolina Futons\\. Hendersonville, NC\\.`),
      ),
    ).toBeInTheDocument();
  });

  it("substitutes {year} with the current year regardless of prop value (cf-n7ni)", () => {
    render(<Footer copyrightLine="Custom prefix · ©{year}· suffix" />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`Custom prefix · ©${year}· suffix`),
    ).toBeInTheDocument();
  });

  it("renders a literal copyright line with no {year} placeholder unchanged (cf-n7ni)", () => {
    render(<Footer copyrightLine="© 1991 Carolina Futons. Forever." />);
    expect(
      screen.getByText(/© 1991 Carolina Futons\. Forever\./),
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

  it("overrides social hrefs when socialUrls prop is provided (cfw-66o.7)", () => {
    render(
      <Footer
        socialUrls={{
          facebook: "https://www.facebook.com/cf-override",
          instagram: "https://www.instagram.com/cf-override",
          tiktok: "https://www.tiktok.com/@cf-override",
          pinterest: "https://www.pinterest.com/cf-override",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      "https://www.facebook.com/cf-override",
    );
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      "https://www.instagram.com/cf-override",
    );
    expect(screen.getByRole("link", { name: /tiktok/i })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@cf-override",
    );
    expect(screen.getByRole("link", { name: /pinterest/i })).toHaveAttribute(
      "href",
      "https://www.pinterest.com/cf-override",
    );
  });

  it("falls back to hardcoded defaults for unset socialUrls keys (partial override)", () => {
    render(<Footer socialUrls={{ facebook: "https://www.facebook.com/cf-override" }} />);
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      "https://www.facebook.com/cf-override",
    );
    // The other three should fall back to FOOTER_SOCIALS defaults
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      "https://www.instagram.com/carolinafutons",
    );
    expect(screen.getByRole("link", { name: /tiktok/i })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@carolinafutons",
    );
    expect(screen.getByRole("link", { name: /pinterest/i })).toHaveAttribute(
      "href",
      "https://www.pinterest.com/carolinafutons",
    );
  });

  it("ignores unsafe javascript: scheme in socialUrls and falls back to default", () => {
    render(<Footer socialUrls={{ facebook: "javascript:alert(1)" }} />);
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      "https://www.facebook.com/carolinafutons",
    );
  });

  it("mounts the newsletter signup form (cf-newsletter-footer)", () => {
    render(<Footer />);
    expect(
      screen.getByRole("form", { name: /newsletter signup/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/stay in the loop/i)).toBeInTheDocument();
  });

  // cfw-eqk: tap-to-call/tap-to-email visual affordance — Lucide Phone +
  // Mail icons next to the existing tel:/mailto: links. The icons are
  // aria-hidden so the accessible name stays the bare phone/email copy
  // (covered by the existing "renders BUSINESS.phone as a tel: link" tests
  // above).
  describe("cfw-eqk tap-to-call/email icons", () => {
    it("renders a Lucide Phone icon inside the phone link", () => {
      render(<Footer />);
      const phoneLink = screen.getByRole("link", {
        name: `Call/Text ${BUSINESS.phone}`,
      });
      // Lucide ships SVGs with class="lucide lucide-phone …"; assert the
      // SVG is present and aria-hidden so screen readers ignore it.
      const svg = phoneLink.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("renders a Lucide Mail icon inside the email link", () => {
      render(<Footer />);
      const emailLink = screen.getByRole("link", { name: BUSINESS.email });
      const svg = emailLink.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});

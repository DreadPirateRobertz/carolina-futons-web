import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ContactPage, { metadata } from "@/app/contact/page";
import { BUSINESS } from "@/lib/business/contact-info";

describe("ContactPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/contact/i);
    expect(metadata.description).toBeTruthy();
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });
});

describe("ContactPage — rendering", () => {
  it("renders the primary h1 heading", () => {
    render(<ContactPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /love to hear from you/i }),
    ).toBeInTheDocument();
  });

  it("renders the direct-contact region with address, phone, email", () => {
    render(<ContactPage />);
    const region = screen.getByRole("region", { name: /reach us directly/i });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toContain(BUSINESS.phone);
    expect(region.textContent).toContain(BUSINESS.email);
    expect(region.textContent).toContain(BUSINESS.street);
    expect(region.textContent).toContain(BUSINESS.city);
    expect(region.textContent).toContain(BUSINESS.zip);
  });

  it("uses the Gmail business inbox, not a vanity-domain address", () => {
    // Guards against an accidental flip to hello@carolinafutons.com (mayor
    // flagged this as a data bug during PR #83 review — the domain isn't
    // owned, so mail would black-hole).
    expect(BUSINESS.email).toBe("carolinafutons@gmail.com");
    expect(BUSINESS.emailHref).toBe("mailto:carolinafutons@gmail.com");
  });

  it("renders a tel: link for the phone number", () => {
    render(<ContactPage />);
    const link = screen.getByRole("link", { name: BUSINESS.phone });
    expect(link.getAttribute("href")).toBe(BUSINESS.phoneHref);
  });

  it("renders a mailto: link for the email", () => {
    render(<ContactPage />);
    const link = screen.getByRole("link", { name: BUSINESS.email });
    expect(link.getAttribute("href")).toBe(BUSINESS.emailHref);
  });

  it("mounts the contact form", () => {
    render(<ContactPage />);
    expect(
      screen.getByRole("form", { name: /contact form/i }),
    ).toBeInTheDocument();
  });

  it("constrains body copy to a 65ch Article-whitespace measure", () => {
    const { container } = render(<ContactPage />);
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });

  it("renders the FogScene hero above the article", () => {
    const { container } = render(<ContactPage />);
    expect(container.querySelector("[data-slot='fog-scene']")).not.toBeNull();
  });
});

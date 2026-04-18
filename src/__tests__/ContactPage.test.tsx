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
});

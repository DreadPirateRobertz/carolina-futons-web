// cfw-tbg: ShowroomCta is the in-person try-it cue on the PDP. The contract
// these tests lock in: address + hours render visibly, the directions link
// points at Google Maps with the encoded address, opens in a new tab, and
// carries the rel attributes that make external-link behavior safe.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ShowroomCta } from "@/components/product/ShowroomCta";
import { BUSINESS } from "@/lib/business/contact-info";

describe("ShowroomCta (cfw-tbg)", () => {
  it("renders the heading + invitation copy", () => {
    render(<ShowroomCta />);
    expect(
      screen.getByRole("heading", { name: /try it in our showroom/i }),
    ).toBeInTheDocument();
  });

  it("renders the showroom address from BUSINESS", () => {
    render(<ShowroomCta />);
    const expected = `${BUSINESS.street}, ${BUSINESS.city} ${BUSINESS.state} ${BUSINESS.zip}`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders the showroom hours", () => {
    render(<ShowroomCta />);
    // Use a regex so a future en-dash / hyphen swap doesn't break the test.
    expect(screen.getByText(/Wed.{1,3}Sat 10am.{1,3}5pm/)).toBeInTheDocument();
  });

  it("Get Directions link goes to Google Maps with the encoded address", () => {
    render(<ShowroomCta />);
    const link = screen.getByTestId("showroom-directions-link");
    const href = link.getAttribute("href");
    expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(href).toContain(encodeURIComponent(BUSINESS.street));
    expect(href).toContain(encodeURIComponent(BUSINESS.zip));
  });

  it("Get Directions link opens in a new tab with safe rel", () => {
    render(<ShowroomCta />);
    const link = screen.getByTestId("showroom-directions-link");
    expect(link).toHaveAttribute("target", "_blank");
    // noopener prevents window.opener leak; noreferrer hides the source URL.
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("uses the pdp-showroom-cta data-slot for layout integration", () => {
    const { container } = render(<ShowroomCta />);
    expect(
      container.querySelector('[data-slot="pdp-showroom-cta"]'),
    ).not.toBeNull();
  });
});

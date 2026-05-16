// cfw-avc: PDP warranty info section. Tests pin duration text comes
// from BUSINESS.warrantyYears, the CTA links to /warranty/register
// with productId + productName query-param pre-fill, and URL encoding
// holds for product names with special characters.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpWarrantyInfo } from "@/components/product/PdpWarrantyInfo";
import { BUSINESS } from "@/lib/business/contact-info";

describe("PdpWarrantyInfo — render", () => {
  it("renders nothing when productId is empty", () => {
    const { container } = render(
      <PdpWarrantyInfo productId="" productName="Anything" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when productName is empty", () => {
    const { container } = render(
      <PdpWarrantyInfo productId="p-1" productName="" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the section heading + warranty duration from BUSINESS", () => {
    render(
      <PdpWarrantyInfo productId="p-1" productName="Carolina Classic Futon" />,
    );
    // Heading carries the duration; pin against role so the body-copy
    // re-mention of "15-year warranty" doesn't double-match.
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });

  it("links to /warranty/register with productId + productName pre-fill", () => {
    render(
      <PdpWarrantyInfo productId="p-1" productName="Carolina Classic Futon" />,
    );
    const cta = screen.getByRole("link", { name: /register warranty/i });
    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("/warranty/register?")).toBe(true);
    expect(href).toContain("productId=p-1");
    expect(href).toContain("productName=Carolina+Classic+Futon");
  });

  it("URL-encodes special characters in productName", () => {
    render(
      <PdpWarrantyInfo
        productId="p-1"
        productName="Cody — Loveseat & Mattress"
      />,
    );
    const cta = screen.getByRole("link", { name: /register warranty/i });
    const href = cta.getAttribute("href") ?? "";
    // URLSearchParams encodes & + em-dash + spaces safely.
    expect(href).not.toContain("Cody — Loveseat & Mattress");
    expect(href).toMatch(/productName=Cody.*Loveseat.*Mattress/);
  });

  it("also links to the /warranty policy page for full coverage details", () => {
    render(
      <PdpWarrantyInfo productId="p-1" productName="Carolina Classic Futon" />,
    );
    const policy = screen.getByRole("link", { name: /full warranty details/i });
    expect(policy).toHaveAttribute("href", "/warranty");
  });
});

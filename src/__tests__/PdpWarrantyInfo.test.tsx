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

// cf-g640 hot-patch: mattress PDPs (standalone-mattress SKUs in the
// `mattresses` Wix collection) carry separate manufacturer warranty
// terms, NOT the 15-year frame warranty. Surfacing this section on a
// mattress PDP misrepresents the warranty contract to the customer
// (legal exposure on NC implied-warranty law). Frames-with-bundled-
// mattress SKUs (e.g. "Cody — Loveseat & Mattress" futon bundle) are
// NOT in the mattresses collection — they keep the frame warranty.
// Gate uses an explicit isMattress boolean rather than a productName
// regex because the bundle case rules out name-based heuristics.
describe("PdpWarrantyInfo — cf-g640 mattress gate", () => {
  it("renders nothing when isMattress is true (standalone mattress SKU)", () => {
    const { container } = render(
      <PdpWarrantyInfo
        productId="m-1"
        productName="Beauty Rest Pillowtop Queen"
        isMattress
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("still renders when isMattress is false (frame product)", () => {
    render(
      <PdpWarrantyInfo
        productId="f-1"
        productName="Kingston Futon Frame"
        isMattress={false}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });

  it("defaults to rendering when isMattress is omitted (back-compat)", () => {
    render(
      <PdpWarrantyInfo
        productId="f-1"
        productName="Kingston Futon Frame"
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });

  it("renders for a futon-with-mattress bundle (frame-bearing — keeps frame warranty)", () => {
    // Pinning the bundle case: "Cody — Loveseat & Mattress" is a futon
    // frame product whose SKU bundles a mattress. The mattress portion
    // of the bundle carries its own manufacturer warranty BUT the frame
    // portion is what this section advertises — render it, since
    // isMattress (the collection-membership signal) is false.
    render(
      <PdpWarrantyInfo
        productId="b-1"
        productName="Cody — Loveseat & Mattress"
        isMattress={false}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });
});

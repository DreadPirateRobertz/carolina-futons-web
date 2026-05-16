// cfw-avc: PDP warranty info section. Tests pin duration text comes
// from BUSINESS.warrantyYears, the CTA links to /warranty/register
// with productId + productName query-param pre-fill, and URL encoding
// holds for product names with special characters.

import { describe, it, expect, beforeAll } from "vitest";
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

// cf-g640 (cfw-avc.fu1): category gate. The 15-year frame-warranty
// copy is wrong for mattress / cover / topper SKUs — those have
// manufacturer-specific warranty terms documented separately on
// /warranty. PdpWarrantyInfo now suppresses itself on non-frame
// products to avoid warranty-misrepresentation legal + 1-star-review
// exposure flagged in miquella's spec-compliance audit 2026-05-15.
describe("PdpWarrantyInfo — category gate (cf-g640)", () => {
  it("renders nothing when isFrame is false (mattress / cover / topper)", () => {
    const { container } = render(
      <PdpWarrantyInfo
        productId="p-1"
        productName="Mesa Latex Mattress"
        isFrame={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the section when isFrame is true (the default)", () => {
    render(
      <PdpWarrantyInfo
        productId="p-1"
        productName="Carolina Classic Futon"
        isFrame={true}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });

  it("renders the section when isFrame is omitted (back-compat default)", () => {
    // Pre-cf-g640 callers didn't pass the prop; default to TRUE so
    // existing frame PDPs keep their warranty section. The page.tsx
    // call site is updated in the same PR to pass explicit isFrame.
    render(
      <PdpWarrantyInfo
        productId="p-1"
        productName="Carolina Classic Futon"
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`${BUSINESS.warrantyYears}-year warranty`, "i"),
      }),
    ).toBeInTheDocument();
  });
});

// cf-g640: the lib-side helper that page.tsx uses to derive the
// `isFrame` prop. Slug-based negative filter — exclude on
// "mattress" / "cover" / "topper" substrings, accept everything
// else (futon frames + platform beds + murphy cabinets + daybeds).
describe("isFrameProduct (cf-g640)", () => {
  // Lazy import — module exists post-PR.
  let isFrameProduct: (slug: string) => boolean;

  beforeAll(async () => {
    const mod = await import("@/lib/product/category-gate");
    isFrameProduct = mod.isFrameProduct;
  });

  it("returns true for futon-frame slugs", () => {
    expect(isFrameProduct("monterey-futon-frame")).toBe(true);
    expect(isFrameProduct("kingston-futon")).toBe(true);
  });

  it("returns true for platform-bed slugs", () => {
    expect(isFrameProduct("charleston-platform-bed")).toBe(true);
    expect(isFrameProduct("nutmeg-platform")).toBe(true);
  });

  it("returns true for murphy-cabinet-bed slugs", () => {
    expect(isFrameProduct("portofino-murphy")).toBe(true);
    expect(isFrameProduct("alpine-murphy-cabinet-bed")).toBe(true);
  });

  it("returns true for daybed slugs", () => {
    expect(isFrameProduct("asheville-daybed")).toBe(true);
  });

  it("returns false for mattress slugs", () => {
    expect(isFrameProduct("mesa-latex-mattress")).toBe(false);
    expect(isFrameProduct("queen-mattress-medium")).toBe(false);
  });

  it("returns false for cover slugs", () => {
    expect(isFrameProduct("full-size-cover-charcoal")).toBe(false);
  });

  it("returns false for topper slugs", () => {
    expect(isFrameProduct("3-inch-latex-topper")).toBe(false);
  });

  it("returns false for empty / null slug (defensive)", () => {
    expect(isFrameProduct("")).toBe(false);
  });
});

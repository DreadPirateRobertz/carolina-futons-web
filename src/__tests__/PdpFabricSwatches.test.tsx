import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PdpFabricSwatches } from "@/components/product/PdpFabricSwatches";
import type { SwatchItem } from "@/lib/swatch-request/swatch-request-schema";

function swatch(
  id: string,
  name: string,
  colorFamily?: string,
  colorHex?: string,
): SwatchItem {
  return { _id: id, swatchName: name, colorFamily, colorHex };
}

const THREE_NEUTRALS = [
  swatch("n1", "Ivory", "Neutral", "#FFFFF0"),
  swatch("n2", "Sand", "Neutral", "#C2B280"),
  swatch("n3", "Parchment", "Neutral"),
];

const MIXED_12 = [
  ...THREE_NEUTRALS,
  swatch("b1", "Navy", "Blue", "#000080"),
  swatch("b2", "Sky", "Blue", "#87CEEB"),
  swatch("g1", "Sage", "Green", "#B2AC88"),
  swatch("g2", "Fern", "Green", "#4F7942"),
  swatch("r1", "Ruby", "Red", "#9B111E"),
  swatch("r2", "Crimson", "Red", "#DC143C"),
  swatch("y1", "Butter", "Yellow"),
  swatch("y2", "Lemon", "Yellow"),
  swatch("k1", "Charcoal", "Black"),
];

function make13(): SwatchItem[] {
  return [
    ...MIXED_12,
    swatch("x1", "Extra", "Extra"),
  ];
}

describe("PdpFabricSwatches — empty guard", () => {
  it("returns null when swatches is empty", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={[]} productSlug="test-product" />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("PdpFabricSwatches — heading and CTA link", () => {
  it("renders section heading with total swatch count", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="futon-a" />);
    expect(screen.getByRole("heading", { name: /available fabrics/i })).toBeTruthy();
    expect(screen.getByText("(3)")).toBeTruthy();
  });

  it("renders 'Order free swatches' link pointing to /swatch-request with product param", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="futon-a" />);
    const link = screen.getByRole("link", { name: /order free swatches/i });
    expect(link.getAttribute("href")).toBe("/swatch-request?product=futon-a");
  });

  it("URL-encodes the product slug in the CTA link", () => {
    render(
      <PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="futon a&b" />,
    );
    const link = screen.getByRole("link", { name: /order free swatches/i });
    expect(link.getAttribute("href")).toBe("/swatch-request?product=futon%20a%26b");
  });
});

describe("PdpFabricSwatches — swatch grid", () => {
  it("renders each swatch name", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" />);
    expect(screen.getByText("Ivory")).toBeTruthy();
    expect(screen.getByText("Sand")).toBeTruthy();
    expect(screen.getByText("Parchment")).toBeTruthy();
  });

  it("sets backgroundColor on color chips when colorHex is present", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" />,
    );
    const chips = container.querySelectorAll("[aria-hidden='true']");
    expect(chips[0].getAttribute("style")).toContain("background-color: rgb");
    expect(chips[2].getAttribute("style")).toBeNull();
  });
});

describe("PdpFabricSwatches — family filter", () => {
  it("does not render family filter when all swatches share one family", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" />);
    expect(screen.queryByRole("group", { name: /filter by color family/i })).toBeNull();
  });

  it("renders family filter when swatches span multiple families", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    expect(screen.getByRole("group", { name: /filter by color family/i })).toBeTruthy();
  });

  it("renders an 'All' button and one button per distinct family", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    expect(screen.getByRole("button", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Neutral" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blue" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Green" })).toBeTruthy();
  });

  it("All button is aria-pressed=true by default", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("clicking a family button filters visible swatches", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getByText("Navy")).toBeTruthy();
    expect(screen.getByText("Sky")).toBeTruthy();
    expect(screen.queryByText("Ivory")).toBeNull();
  });

  it("family button becomes aria-pressed after click", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    const btn = screen.getByRole("button", { name: "Blue" });
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("clicking active family button again resets to All", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    const btn = screen.getByRole("button", { name: "Blue" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Ivory")).toBeTruthy();
  });

  it("clicking All button clears active family filter", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Ivory")).toBeTruthy();
    expect(screen.getByText("Navy")).toBeTruthy();
  });
});

describe("PdpFabricSwatches — show all / pagination", () => {
  it("shows at most 12 swatches by default when more exist", () => {
    const swatches = make13();
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(12);
  });

  it("shows 'Show all N fabrics' toggle when more than 12 swatches", () => {
    render(<PdpFabricSwatches swatches={make13()} productSlug="p" />);
    expect(screen.getByRole("button", { name: /show all 13 fabrics/i })).toBeTruthy();
  });

  it("does not show toggle when 12 or fewer swatches", () => {
    render(<PdpFabricSwatches swatches={MIXED_12} productSlug="p" />);
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  it("clicking 'Show all' expands to all swatches and changes label to 'Show fewer'", () => {
    const swatches = make13();
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: /show all 13 fabrics/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
    expect(screen.getByRole("button", { name: /show fewer/i })).toBeTruthy();
  });

  it("clicking 'Show fewer' collapses back to 12", () => {
    const swatches = make13();
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: /show all 13 fabrics/i }));
    fireEvent.click(screen.getByRole("button", { name: /show fewer/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });

  it("switching family resets showAll so count reflects filtered set", () => {
    const swatches = make13();
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    // Expand all
    fireEvent.click(screen.getByRole("button", { name: /show all 13 fabrics/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
    // Filter to Neutral (3 swatches) — showAll should reset, no toggle shown
    fireEvent.click(screen.getByRole("button", { name: "Neutral" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  it("clicking All also resets showAll", () => {
    const swatches = make13();
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    // Filter to a small family first
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    // Then back to All — toggle should reappear (not in expanded state)
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByRole("button", { name: /show all 13 fabrics/i })).toBeTruthy();
  });
});

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

  it("sets backgroundColor on color chip when colorHex is present", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" />);
    const ivoryItem = screen.getByText("Ivory").closest("li")!;
    const ivoryChip = ivoryItem.querySelector("[aria-hidden='true']");
    expect(ivoryChip?.getAttribute("style")).toContain("background-color");
  });

  it("omits style on color chip when colorHex is absent", () => {
    render(<PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" />);
    const parchmentItem = screen.getByText("Parchment").closest("li")!;
    const parchmentChip = parchmentItem.querySelector("[aria-hidden='true']");
    expect(parchmentChip?.getAttribute("style")).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByRole("button", { name: /show all 13 fabrics/i })).toBeTruthy();
  });

  it("active family filter with > 12 members shows pagination toggle", () => {
    // Build 14 Blue swatches + a few others so Blue alone exceeds INITIAL_VISIBLE
    const manyBlue: SwatchItem[] = Array.from({ length: 14 }, (_, i) =>
      swatch(`b${i}`, `Blue ${i}`, "Blue"),
    );
    const swatches = [...manyBlue, swatch("r1", "Red 1", "Red")];
    render(<PdpFabricSwatches swatches={swatches} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByRole("button", { name: /show all 14 fabrics/i })).toBeTruthy();
  });
});

describe("PdpFabricSwatches — swatches without colorFamily", () => {
  const withOrphans = [
    swatch("n1", "Navy", "Blue"),
    swatch("r1", "Ruby", "Red"),
    swatch("o1", "Mystery"), // no colorFamily
    swatch("o2", "Unknown"), // no colorFamily
  ];

  it("orphan swatches appear under All filter", () => {
    render(<PdpFabricSwatches swatches={withOrphans} productSlug="p" />);
    expect(screen.getByText("Mystery")).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("orphan swatches are hidden under a specific family filter", () => {
    render(<PdpFabricSwatches swatches={withOrphans} productSlug="p" />);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getByText("Navy")).toBeTruthy();
    expect(screen.queryByText("Mystery")).toBeNull();
    expect(screen.queryByText("Unknown")).toBeNull();
  });

  it("orphan swatches do not create family filter buttons", () => {
    render(<PdpFabricSwatches swatches={withOrphans} productSlug="p" />);
    // Only "Blue" should appear as a family button (not undefined/null)
    expect(screen.queryByRole("button", { name: "undefined" })).toBeNull();
    expect(screen.getByRole("button", { name: "Blue" })).toBeTruthy();
  });
});

describe("PdpFabricSwatches — error state", () => {
  it("renders error message when error=true and swatches is empty", () => {
    render(<PdpFabricSwatches swatches={[]} productSlug="p" error={true} />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
  });

  it("returns null when error is absent and swatches is empty", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={[]} productSlug="p" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders swatches normally when error=true but swatches are present", () => {
    render(
      <PdpFabricSwatches swatches={THREE_NEUTRALS} productSlug="p" error={true} />,
    );
    expect(screen.getByRole("heading", { name: /available fabrics/i })).toBeTruthy();
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
  });
});

// ── imageUrl / photo rendering (cf-vh30) ────────────────────────────────────

describe("PdpFabricSwatches — photo swatches (cf-vh30)", () => {
  const photoSwatch: SwatchItem = {
    _id: "p1",
    swatchName: "Crypton Taupe",
    colorFamily: "Neutral",
    colorHex: "#B2A99A",
    imageUrl: "https://cdn.crypton.com/swatches/taupe.jpg",
  };

  it("renders an img element when imageUrl is present", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={[photoSwatch]} productSlug="p" />,
    );
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("img has src containing the imageUrl", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={[photoSwatch]} productSlug="p" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") ?? "").toContain("crypton.com");
  });

  it("falls back to hex dot when no imageUrl", () => {
    const hexOnly: SwatchItem = { _id: "h1", swatchName: "Sand", colorHex: "#C2B280" };
    const { container } = render(
      <PdpFabricSwatches swatches={[hexOnly]} productSlug="p" />,
    );
    expect(container.querySelector("img")).toBeNull();
    // hex circle rendered as a div with backgroundColor
    const dot = container.querySelector('[aria-hidden="true"][style]');
    expect(dot).not.toBeNull();
  });

  it("renders mixed photo + hex swatches together", () => {
    const mixed: SwatchItem[] = [
      photoSwatch,
      { _id: "h1", swatchName: "Sand", colorFamily: "Neutral", colorHex: "#C2B280" },
    ];
    const { container } = render(
      <PdpFabricSwatches swatches={mixed} productSlug="p" />,
    );
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.getByText("Crypton Taupe")).toBeInTheDocument();
    expect(screen.getByText("Sand")).toBeInTheDocument();
  });

  it("img is aria-hidden (decorative — name shown in text label below)", () => {
    const { container } = render(
      <PdpFabricSwatches swatches={[photoSwatch]} productSlug="p" />,
    );
    const imgWrapper = container.querySelector('[aria-hidden="true"]');
    expect(imgWrapper).not.toBeNull();
  });
});

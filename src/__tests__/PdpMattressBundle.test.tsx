import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PdpMattressBundle } from "@/components/product/PdpMattressBundle";
import type { MattressOption } from "@/lib/product/mattress-bundle";

// cf-h1i4: mattress bundle panel on futon PDPs

const MESA_1000: MattressOption = {
  id: "prod-m1",
  slug: "mesa-1000-mattress",
  name: "Mesa 1000 Mattress",
  comfort: "Plush",
  tagline: "Cloud-soft support",
  priceText: "$299",
  unitPriceCents: 29900,
};

const MESA_3000: MattressOption = {
  id: "prod-m3",
  slug: "mesa-3000-mattress",
  name: "Mesa 3000 Mattress",
  comfort: "Medium",
  tagline: "Balanced everyday comfort",
  priceText: "$399",
  unitPriceCents: 39900,
};

const MESA_5000: MattressOption = {
  id: "prod-m5",
  slug: "mesa-5000-mattress",
  name: "Mesa 5000 Mattress",
  comfort: "Firm",
  tagline: "Structured, supportive feel",
  priceText: "$499",
  unitPriceCents: 49900,
};

const ALL_THREE = [MESA_1000, MESA_3000, MESA_5000];

vi.mock("@/components/cart/AddToCartButton", () => ({
  AddToCartButton: ({ productName }: { productName: string }) => (
    <button type="button">Add {productName}</button>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("PdpMattressBundle (cf-h1i4)", () => {
  it("renders the section landmark", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(
      screen.getByRole("region", { name: /add a mattress/i }),
    ).toBeInTheDocument();
  });

  it("renders all three comfort levels", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(screen.getByText("Plush")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Firm")).toBeInTheDocument();
  });

  it("renders the three taglines", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(screen.getByText(/cloud-soft support/i)).toBeInTheDocument();
    expect(screen.getByText(/balanced everyday comfort/i)).toBeInTheDocument();
    expect(screen.getByText(/structured, supportive feel/i)).toBeInTheDocument();
  });

  it("renders exactly three list items", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders an Add to cart button for each mattress", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(screen.getByRole("button", { name: /add mesa 1000/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add mesa 3000/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add mesa 5000/i })).toBeInTheDocument();
  });

  it("exposes the pdp-mattress-bundle data slot", () => {
    const { container } = render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(
      container.querySelector("[data-slot='pdp-mattress-bundle']"),
    ).not.toBeNull();
  });

  it("shows each mattress price", () => {
    render(<PdpMattressBundle mattresses={ALL_THREE} />);
    expect(screen.getByText("$299")).toBeInTheDocument();
    expect(screen.getByText("$399")).toBeInTheDocument();
    expect(screen.getByText("$499")).toBeInTheDocument();
  });

  it("renders nothing when mattresses list is empty", () => {
    const { container } = render(<PdpMattressBundle mattresses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders gracefully with a partial list (one mattress)", () => {
    render(<PdpMattressBundle mattresses={[MESA_3000]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });
});

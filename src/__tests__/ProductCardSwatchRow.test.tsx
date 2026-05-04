import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProductCardSwatchRow } from "@/components/product/ProductCardSwatchRow";

describe("ProductCardSwatchRow", () => {
  it("renders nothing when there are no choices", () => {
    const { container } = render(<ProductCardSwatchRow choices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the singular badge for exactly one color", () => {
    render(
      <ProductCardSwatchRow choices={[{ label: "Natural", hex: "#D4B896" }]} />,
    );
    expect(screen.getByText("1 color")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("renders the plural badge with up to 5 dots", () => {
    const choices = [
      { label: "Natural", hex: "#D4B896" },
      { label: "Espresso", hex: "#3A2518" },
      { label: "Walnut", hex: "#5C4030" },
    ];
    render(<ProductCardSwatchRow choices={choices} />);
    expect(screen.getByText("Available in 3 colors")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("caps the dot strip at 5 visible swatches and shows +N overflow", () => {
    const choices = Array.from({ length: 7 }, (_, i) => ({
      label: `Color${i + 1}`,
      hex: "#888888",
    }));
    const { container } = render(<ProductCardSwatchRow choices={choices} />);
    expect(screen.getByText("Available in 7 colors")).toBeInTheDocument();
    const dots = container.querySelectorAll("[data-slot='swatch-dot']");
    expect(dots).toHaveLength(5);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("applies the hex backgroundColor to each dot", () => {
    const { container } = render(
      <ProductCardSwatchRow
        choices={[{ label: "Espresso", hex: "#3A2518" }]}
      />,
    );
    const dot = container.querySelector(
      "[data-slot='swatch-dot']",
    ) as HTMLElement | null;
    expect(dot?.style.backgroundColor).toBe("rgb(58, 37, 24)");
  });

  it("uses the choice label as accessible name + tooltip", () => {
    const { container } = render(
      <ProductCardSwatchRow choices={[{ label: "Espresso", hex: "#3A2518" }]} />,
    );
    expect(
      container.querySelector("[data-color-label='Espresso']"),
    ).not.toBeNull();
    const dot = container.querySelector(
      "[data-slot='swatch-dot']",
    ) as HTMLElement | null;
    expect(dot?.getAttribute("title")).toBe("Espresso");
  });
});

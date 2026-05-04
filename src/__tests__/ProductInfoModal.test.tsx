import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProductInfoModal } from "@/components/product/ProductInfoModal";
import type { ProductDimensions, CareGuide } from "@/lib/product/size-guide";

const DIMS: ProductDimensions = {
  productId: "prod-1",
  unit: "in",
  closed: { width: 80, depth: 34, height: 34 },
  open: { width: 80, depth: 86, height: 17 },
  seatHeight: 18,
  weight: 140,
  mattressSize: "Full",
  shipping: null,
};

const CARE: CareGuide = {
  material: "fabric",
  cleaningMethod: "Spot clean with mild soap.",
  maintenanceTips: "Vacuum weekly.",
  warningNotes: "No bleach.",
};

describe("ProductInfoModal", () => {
  it("renders a trigger button", () => {
    render(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    expect(
      screen.getByRole("button", { name: /dimensions & care/i }),
    ).toBeInTheDocument();
  });

  it("exposes the product-info-modal-trigger data slot", () => {
    const { container } = render(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    expect(
      container.querySelector('[data-slot="product-info-modal-trigger"]'),
    ).not.toBeNull();
  });

  it("has aria-haspopup=dialog on the trigger", () => {
    render(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    expect(
      screen.getByRole("button", { name: /dimensions & care/i }),
    ).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("renders a dialog element with the product name as label", () => {
    const { container } = render(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  function openModal(ui: React.ReactElement) {
    const result = render(ui);
    fireEvent.click(screen.getByRole("button", { name: /dimensions & care/i }));
    return result;
  }

  it("shows Dimensions and Care Guide tabs after opening", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={CARE} />,
    );
    expect(screen.getByRole("tab", { name: /dimensions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /care guide/i })).toBeInTheDocument();
  });

  it("activates Dimensions tab by default after opening", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={CARE} />,
    );
    expect(screen.getByRole("tab", { name: /dimensions/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /care guide/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches to care guide tab on click", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={CARE} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /care guide/i }));
    expect(screen.getByRole("tab", { name: /care guide/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: /care guide/i })).not.toHaveAttribute("hidden");
  });

  it("renders care guide content in care tab", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={CARE} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /care guide/i }));
    expect(screen.getByText("Spot clean with mild soap.")).toBeInTheDocument();
  });

  it("renders generic care guide when careGuide is null", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /care guide/i }));
    expect(screen.getByText(/no product-specific care guide/i)).toBeInTheDocument();
  });

  it("renders a close button after opening", () => {
    openModal(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    expect(
      screen.getByRole("button", { name: /close dimensions and care guide/i }),
    ).toBeInTheDocument();
  });

  it("exposes the product-info-modal data slot", () => {
    const { container } = render(
      <ProductInfoModal productName="Rio Futon" dimensions={DIMS} careGuide={null} />,
    );
    expect(
      container.querySelector('[data-slot="product-info-modal"]'),
    ).not.toBeNull();
  });
});

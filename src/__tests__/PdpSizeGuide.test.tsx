import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PdpSizeGuide } from "@/components/product/PdpSizeGuide";
import type { ProductDimensions } from "@/lib/product/size-guide";

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

describe("PdpSizeGuide", () => {
  it("renders a dimensions landmark with the product name", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(
      screen.getByRole("region", { name: /dimensions.*westport futon/i }),
    ).toBeInTheDocument();
  });

  it("shows a placeholder when dimensions is null", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={null} />);
    expect(screen.getByText(/dimensions coming soon/i)).toBeInTheDocument();
  });

  it("renders closed and open dimension rows", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(screen.getByText(/closed.*sofa/i)).toBeInTheDocument();
    expect(screen.getByText(/open.*bed/i)).toBeInTheDocument();
  });

  it("renders seat height and weight rows when present", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(screen.getByText(/seat height/i)).toBeInTheDocument();
    expect(screen.getByText(/weight/i)).toBeInTheDocument();
    expect(screen.getByText(/140 lbs/i)).toBeInTheDocument();
  });

  it("renders mattress size row when present", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(screen.getByText(/mattress size/i)).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("has inches selected by default", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    const inchesRadio = screen.getByRole("radio", { name: /inches/i });
    expect(inchesRadio).toBeChecked();
  });

  it("switches to centimeters when cm radio is selected", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    const cmRadio = screen.getByRole("radio", { name: /centimeters/i });
    fireEvent.click(cmRadio);
    expect(cmRadio).toBeChecked();
    // cm values appear — 80" = 203.2cm (both closed and open width rows use this value)
    const cmRows = screen.getAllByText(/203\.2/);
    expect(cmRows.length).toBeGreaterThan(0);
  });

  it("renders the room-fit checker form", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(screen.getByRole("form", { name: /room fit checker/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check fit/i })).toBeInTheDocument();
  });

  it("shows a fit verdict after submitting valid room dimensions", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    fireEvent.change(screen.getByLabelText(/room width/i), { target: { value: "144" } });
    fireEvent.change(screen.getByLabelText(/room depth/i), { target: { value: "168" } });
    fireEvent.submit(screen.getByRole("form", { name: /room fit checker/i }));
    expect(screen.getByTestId("room-fit-result")).toBeInTheDocument();
  });

  it("shows an error when room width and depth are blank", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    fireEvent.submit(screen.getByRole("form", { name: /room fit checker/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows a good-fit verdict for a large room", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    fireEvent.change(screen.getByLabelText(/room width/i), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/room depth/i), { target: { value: "200" } });
    fireEvent.submit(screen.getByRole("form", { name: /room fit checker/i }));
    const result = screen.getByTestId("room-fit-result");
    expect(result).toHaveAttribute("data-verdict", "fits");
  });

  it("shows a no-fit verdict when room is too small", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    fireEvent.change(screen.getByLabelText(/room width/i), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText(/room depth/i), { target: { value: "60" } });
    fireEvent.submit(screen.getByRole("form", { name: /room fit checker/i }));
    const result = screen.getByTestId("room-fit-result");
    expect(result).toHaveAttribute("data-verdict", "no-fit");
  });

  it("renders the SVG dimension diagram", () => {
    const { container } = render(
      <PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />,
    );
    expect(container.querySelector("svg[role='img']")).not.toBeNull();
  });

  it("renders sofa/bed diagram toggle buttons", () => {
    render(<PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />);
    expect(screen.getByRole("button", { name: /sofa.*closed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bed.*open/i })).toBeInTheDocument();
  });

  it("renders care guide inline when provided", () => {
    render(
      <PdpSizeGuide
        productName="Westport Futon"
        dimensions={DIMS}
        careGuide={{
          material: "fabric",
          cleaningMethod: "Spot clean only.",
          maintenanceTips: "Vacuum monthly.",
          warningNotes: "",
        }}
      />,
    );
    expect(screen.getByText(/fabric care guide/i)).toBeInTheDocument();
    expect(screen.getByText("Spot clean only.")).toBeInTheDocument();
  });

  it("exposes the pdp-size-guide data slot", () => {
    const { container } = render(
      <PdpSizeGuide productName="Westport Futon" dimensions={DIMS} />,
    );
    expect(container.querySelector('[data-slot="pdp-size-guide"]')).not.toBeNull();
  });
});

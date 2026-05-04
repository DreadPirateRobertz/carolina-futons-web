import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PdpFinancing } from "@/components/product/PdpFinancing";

function cents(dollars: number) {
  return Math.round(dollars * 100);
}

describe("PdpFinancing — gate", () => {
  it("renders nothing when price is below $500", () => {
    const { container } = render(<PdpFinancing unitPriceCents={cents(499)} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is zero", () => {
    const { container } = render(<PdpFinancing unitPriceCents={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is NaN", () => {
    const { container } = render(<PdpFinancing unitPriceCents={NaN} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is Infinity", () => {
    const { container } = render(<PdpFinancing unitPriceCents={Infinity} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing at 49999 cents (below gate)", () => {
    const { container } = render(<PdpFinancing unitPriceCents={49999} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the section at exactly $500 (50000 cents)", () => {
    render(<PdpFinancing unitPriceCents={50000} />);
    expect(screen.getByTestId("pdp-financing")).toBeInTheDocument();
  });

  it("renders the section at 50001 cents (just above gate)", () => {
    render(<PdpFinancing unitPriceCents={50001} />);
    expect(screen.getByTestId("pdp-financing")).toBeInTheDocument();
  });
});

describe("PdpFinancing — Afterpay teaser", () => {
  it("shows 4-payment Afterpay breakdown for price <= $1,000", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    expect(screen.getByText(/4 payments of \$200\.00/i)).toBeInTheDocument();
  });

  it("does not show Afterpay for price above $1,000", () => {
    render(<PdpFinancing unitPriceCents={cents(1200)} />);
    expect(screen.queryByText(/afterpay/i)).not.toBeInTheDocument();
  });

  it("shows Afterpay at exactly $1,000", () => {
    render(<PdpFinancing unitPriceCents={cents(1000)} />);
    expect(screen.getByText(/4 payments of \$250\.00/i)).toBeInTheDocument();
  });
});

describe("PdpFinancing — monthly teaser", () => {
  it("shows 'As low as' teaser with lowest monthly amount", () => {
    // $600 / 12 months = $50/mo (lowest term)
    render(<PdpFinancing unitPriceCents={cents(600)} />);
    expect(screen.getByText(/as low as \$50\/mo/i)).toBeInTheDocument();
  });

  it("shows correct monthly for high price with no Afterpay", () => {
    // $1,200 — Afterpay not eligible; 12-month = $100/mo
    render(<PdpFinancing unitPriceCents={cents(1200)} />);
    expect(screen.getByText(/as low as \$100\/mo/i)).toBeInTheDocument();
  });
});

describe("PdpFinancing — term pills", () => {
  it("shows 3, 6, and 12 month term pills", () => {
    render(<PdpFinancing unitPriceCents={cents(600)} />);
    expect(screen.getByText("3 mo")).toBeInTheDocument();
    expect(screen.getByText("6 mo")).toBeInTheDocument();
    expect(screen.getByText("12 mo")).toBeInTheDocument();
  });

  it("each pill shows the correct monthly payment", () => {
    // $600: 3mo=$200, 6mo=$100, 12mo=$50
    render(<PdpFinancing unitPriceCents={cents(600)} />);
    expect(screen.getByTestId("pill-3")).toHaveTextContent("$200.00/mo");
    expect(screen.getByTestId("pill-6")).toHaveTextContent("$100.00/mo");
    expect(screen.getByTestId("pill-12")).toHaveTextContent("$50.00/mo");
  });

  it("pill amounts update correctly at $900", () => {
    // $900: 3mo=$300, 6mo=$150, 12mo=$75
    render(<PdpFinancing unitPriceCents={cents(900)} />);
    expect(screen.getByTestId("pill-3")).toHaveTextContent("$300.00/mo");
    expect(screen.getByTestId("pill-6")).toHaveTextContent("$150.00/mo");
    expect(screen.getByTestId("pill-12")).toHaveTextContent("$75.00/mo");
  });
});

describe("PdpFinancing — modal", () => {
  it("modal is not visible initially", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens modal on 'See all options' click", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal shows Afterpay 4-payment schedule for eligible price", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByText(/pay in 4/i)).toBeInTheDocument();
  });

  it("modal Afterpay schedule shows all 4 installments with correct amounts", () => {
    // $800 / 4 = $200.00 per installment, all 4 equal (evenly divisible)
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByText(/today: \$200\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/in 2 weeks: \$200\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/in 4 weeks: \$200\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/in 6 weeks: \$200\.00/i)).toBeInTheDocument();
  });

  it("4th installment reconciles rounding — schedule sums to price", () => {
    // $999: installment = roundCents(999/4) = $249.75; 4th = $999 - $249.75*3 = $249.75
    render(<PdpFinancing unitPriceCents={cents(999)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByText(/today: \$249\.75/i)).toBeInTheDocument();
    expect(screen.getByText(/in 2 weeks: \$249\.75/i)).toBeInTheDocument();
    expect(screen.getByText(/in 4 weeks: \$249\.75/i)).toBeInTheDocument();
    expect(screen.getByText(/in 6 weeks: \$249\.75/i)).toBeInTheDocument();
  });

  it("modal shows all three term details", () => {
    render(<PdpFinancing unitPriceCents={cents(600)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByTestId("modal-term-3")).toBeInTheDocument();
    expect(screen.getByTestId("modal-term-6")).toBeInTheDocument();
    expect(screen.getByTestId("modal-term-12")).toBeInTheDocument();
  });

  it("modal shows total for each term", () => {
    render(<PdpFinancing unitPriceCents={cents(600)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    const totalEls = screen.getAllByText(/total: \$600\.00/i);
    expect(totalEls.length).toBeGreaterThanOrEqual(3);
  });

  it("closes modal on close button click", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close financing options/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal on Escape key", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal on backdrop click", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog); // clicking the backdrop (the dialog element itself)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("modal title is accessible", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
  });
});

describe("PdpFinancing — accessibility", () => {
  it("section has a labelled heading", () => {
    render(<PdpFinancing unitPriceCents={cents(700)} />);
    expect(screen.getByRole("heading", { name: /financing/i })).toBeInTheDocument();
  });

  it("afterpay teaser is present in the DOM for eligible prices", () => {
    render(<PdpFinancing unitPriceCents={cents(800)} />);
    expect(screen.getByTestId("afterpay-teaser")).toBeInTheDocument();
  });
});

describe("PdpFinancing — variant-priced products (cf-d3hc)", () => {
  it("renders when unitPriceCents comes from priceRange.maxValue (manageVariants products)", () => {
    // manageVariants products have priceData.price=0 but priceRange.maxValue may be non-zero.
    // PdpInteractive passes whiteGlovePriceCents ?? fallbackPriceCents so financing shows
    // correctly for these products instead of being gated out by the zero base price.
    render(<PdpFinancing unitPriceCents={cents(750)} />);
    expect(screen.getByTestId("pdp-financing")).toBeInTheDocument();
    expect(screen.getByText(/as low as/i)).toBeInTheDocument();
  });

  it("does not render when both fallback and range price are below gate", () => {
    const { container } = render(<PdpFinancing unitPriceCents={cents(200)} />);
    expect(container.firstChild).toBeNull();
  });
});

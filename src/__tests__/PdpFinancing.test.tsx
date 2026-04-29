import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PdpFinancing } from "@/components/product/PdpFinancing";

// Helpers
function cents(dollars: number) {
  return Math.round(dollars * 100);
}

describe("PdpFinancing — gate", () => {
  it("renders nothing when price is below $500", () => {
    const { container } = render(<PdpFinancing priceCents={cents(499)} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when price is zero", () => {
    const { container } = render(<PdpFinancing priceCents={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the section at exactly $500", () => {
    render(<PdpFinancing priceCents={cents(500)} />);
    expect(screen.getByTestId("pdp-financing")).toBeInTheDocument();
  });
});

describe("PdpFinancing — Afterpay teaser", () => {
  it("shows 4-payment Afterpay breakdown for price <= $1,000", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    // $800 / 4 = $200 per installment
    expect(screen.getByText(/4 payments of \$200\.00/i)).toBeInTheDocument();
  });

  it("does not show Afterpay for price above $1,000", () => {
    render(<PdpFinancing priceCents={cents(1200)} />);
    expect(screen.queryByText(/afterpay/i)).not.toBeInTheDocument();
  });

  it("shows Afterpay at exactly $1,000", () => {
    render(<PdpFinancing priceCents={cents(1000)} />);
    expect(screen.getByText(/4 payments of \$250\.00/i)).toBeInTheDocument();
  });
});

describe("PdpFinancing — monthly teaser", () => {
  it("shows 'As low as' teaser with lowest monthly amount", () => {
    // $600 / 12 months = $50/mo (lowest term)
    render(<PdpFinancing priceCents={cents(600)} />);
    expect(screen.getByText(/as low as \$50\/mo/i)).toBeInTheDocument();
  });

  it("shows correct monthly for high price with no Afterpay", () => {
    // $1,200 — Afterpay not eligible; 12-month = $100/mo
    render(<PdpFinancing priceCents={cents(1200)} />);
    expect(screen.getByText(/as low as \$100\/mo/i)).toBeInTheDocument();
  });
});

describe("PdpFinancing — term pills", () => {
  it("shows 3, 6, and 12 month term pills", () => {
    render(<PdpFinancing priceCents={cents(600)} />);
    expect(screen.getByText("3 mo")).toBeInTheDocument();
    expect(screen.getByText("6 mo")).toBeInTheDocument();
    expect(screen.getByText("12 mo")).toBeInTheDocument();
  });

  it("each pill shows the correct monthly payment", () => {
    // $600: 3mo=$200, 6mo=$100, 12mo=$50
    render(<PdpFinancing priceCents={cents(600)} />);
    expect(screen.getByTestId("pill-3")).toHaveTextContent("$200.00/mo");
    expect(screen.getByTestId("pill-6")).toHaveTextContent("$100.00/mo");
    expect(screen.getByTestId("pill-12")).toHaveTextContent("$50.00/mo");
  });

  it("pill amounts update correctly at $900", () => {
    // $900: 3mo=$300, 6mo=$150, 12mo=$75
    render(<PdpFinancing priceCents={cents(900)} />);
    expect(screen.getByTestId("pill-3")).toHaveTextContent("$300.00/mo");
    expect(screen.getByTestId("pill-6")).toHaveTextContent("$150.00/mo");
    expect(screen.getByTestId("pill-12")).toHaveTextContent("$75.00/mo");
  });
});

describe("PdpFinancing — modal", () => {
  it("modal is not visible initially", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens modal on 'See all options' click", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal shows Afterpay 4-payment schedule for eligible price", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    // $800/4 = $200 installments
    expect(screen.getAllByText(/\$200\.00/)).not.toHaveLength(0);
    expect(screen.getByText(/pay in 4/i)).toBeInTheDocument();
  });

  it("modal shows all three term details", () => {
    render(<PdpFinancing priceCents={cents(600)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByTestId("modal-term-3")).toBeInTheDocument();
    expect(screen.getByTestId("modal-term-6")).toBeInTheDocument();
    expect(screen.getByTestId("modal-term-12")).toBeInTheDocument();
  });

  it("modal shows total for each term", () => {
    render(<PdpFinancing priceCents={cents(600)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    // 0% APR, so total = price for each term
    const totalEls = screen.getAllByText(/total: \$600\.00/i);
    expect(totalEls.length).toBeGreaterThanOrEqual(3);
  });

  it("closes modal on close button click", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("modal title is accessible", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    fireEvent.click(screen.getByRole("button", { name: /see all options/i }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
  });
});

describe("PdpFinancing — accessibility", () => {
  it("section has a labelled heading", () => {
    render(<PdpFinancing priceCents={cents(700)} />);
    expect(screen.getByRole("heading", { name: /financing/i })).toBeInTheDocument();
  });

  it("Afterpay text uses aria-label for screen readers", () => {
    render(<PdpFinancing priceCents={cents(800)} />);
    const afterpayEl = screen.getByTestId("afterpay-teaser");
    expect(afterpayEl).toHaveAttribute("aria-label");
  });
});

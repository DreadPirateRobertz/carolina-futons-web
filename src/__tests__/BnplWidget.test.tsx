// cfw-8cx: BnplWidget contract.
//   - Hidden under the $50 BNPL minimum so we don't advertise an option the
//     visitor can't actually use at checkout.
//   - Teaser uses ceil(price / 12) so "$67/mo" never undersells the real
//     installment a lender would charge.
//   - Click reveals the disclosure panel with 4/12/24 month rows + brand
//     chips. Trigger toggles aria-expanded so AT users hear the state flip.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { BnplWidget } from "@/components/product/BnplWidget";

describe("BnplWidget (cfw-8cx)", () => {
  it("hides itself when price is below the $50 threshold", () => {
    const { container } = render(<BnplWidget unitPriceCents={4_999} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides itself for non-finite prices", () => {
    const { container } = render(<BnplWidget unitPriceCents={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the teaser at the threshold", () => {
    render(<BnplWidget unitPriceCents={5_000} />);
    expect(screen.getByTestId("pdp-bnpl-widget")).toBeInTheDocument();
  });

  it("teaser monthly is the price divided by 12, rounded up to a whole dollar", () => {
    // $799 / 12 = $66.58 → ceil → $67
    render(<BnplWidget unitPriceCents={79_900} />);
    const trigger = screen.getByTestId("bnpl-trigger");
    expect(trigger).toHaveTextContent("As low as $67/mo with");
  });

  it("teaser pairs the monthly amount with the Affirm logo for the visible run", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    const trigger = screen.getByTestId("bnpl-trigger");
    expect(within(trigger).getByTestId("bnpl-logo-affirm")).toBeInTheDocument();
  });

  it("disclosure panel is hidden by default and trigger reflects collapsed state", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    expect(screen.getByTestId("bnpl-panel")).not.toBeVisible();
    expect(screen.getByTestId("bnpl-trigger")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("clicking the trigger expands the panel and flips aria-expanded", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.getByTestId("bnpl-panel")).toBeVisible();
    expect(screen.getByTestId("bnpl-trigger")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("expanded panel shows 4, 12, and 24 month installment rows", () => {
    render(<BnplWidget unitPriceCents={120_000} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));

    // $1,200 across 4 / 12 / 24 months = $300 / $100 / $50.
    expect(screen.getByTestId("bnpl-term-4")).toHaveTextContent("4 mo");
    expect(screen.getByTestId("bnpl-term-4")).toHaveTextContent("$300.00/mo");
    expect(screen.getByTestId("bnpl-term-12")).toHaveTextContent("$100.00/mo");
    expect(screen.getByTestId("bnpl-term-24")).toHaveTextContent("$50.00/mo");
  });

  it("expanded panel surfaces both Affirm and Afterpay brand chips", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.getAllByTestId("bnpl-logo-affirm").length).toBeGreaterThan(0);
    expect(screen.getByTestId("bnpl-logo-afterpay")).toBeInTheDocument();
  });

  it("clicking the trigger a second time collapses the panel", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    const trigger = screen.getByTestId("bnpl-trigger");
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.getByTestId("bnpl-panel")).not.toBeVisible();
  });
});

describe("BnplWidget — Afterpay pay-in-4 (cf-cd9u)", () => {
  it("shows Afterpay pay-in-4 schedule when price is within the $1,000 limit", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.getByTestId("afterpay-pay-in-4")).toBeInTheDocument();
    expect(screen.getByTestId("afterpay-schedule")).toBeInTheDocument();
  });

  it("shows 4 schedule rows with equal installments (price / 4)", () => {
    // $800 / 4 = $200.00 per installment
    render(<BnplWidget unitPriceCents={80_000} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    const schedule = screen.getByTestId("afterpay-schedule");
    const rows = within(schedule).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(row).toHaveTextContent("$200.00");
    });
  });

  it("schedule rows carry the expected labels", () => {
    render(<BnplWidget unitPriceCents={79_900} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    const schedule = screen.getByTestId("afterpay-schedule");
    expect(within(schedule).getByText("Today")).toBeInTheDocument();
    expect(within(schedule).getByText("In 2 weeks")).toBeInTheDocument();
    expect(within(schedule).getByText("In 4 weeks")).toBeInTheDocument();
    expect(within(schedule).getByText("In 6 weeks")).toBeInTheDocument();
  });

  it("hides Afterpay pay-in-4 when price exceeds the $1,000 limit", () => {
    render(<BnplWidget unitPriceCents={100_001} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.queryByTestId("afterpay-pay-in-4")).not.toBeInTheDocument();
  });

  it("shows Afterpay badge in provider row when price exceeds $1,000 limit", () => {
    render(<BnplWidget unitPriceCents={150_000} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.getByTestId("bnpl-logo-afterpay")).toBeInTheDocument();
  });

  it("shows Afterpay pay-in-4 at exactly the $1,000 limit", () => {
    render(<BnplWidget unitPriceCents={100_000} />);
    fireEvent.click(screen.getByTestId("bnpl-trigger"));
    expect(screen.getByTestId("afterpay-pay-in-4")).toBeInTheDocument();
  });
});

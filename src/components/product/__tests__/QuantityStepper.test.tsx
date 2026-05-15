/**
 * cf-pdp-g1: PDP quantity stepper — closes the qty=1-always parity gap
 * surfaced by cf-lc1c. Tests written before the component (TDD per bead
 * acceptance: "qty stepper renders (1–99), value passed to cart action").
 *
 * Behaviors covered:
 *  - Renders with the provided value as the displayed quantity.
 *  - Plus button increments by 1; minus button decrements by 1.
 *  - Plus button disabled at max (default 99); minus disabled at min (default 1).
 *  - Direct numeric input clamps to [min, max] on blur.
 *  - Non-numeric input is ignored (value stays at last valid number).
 *  - disabled prop disables all three controls.
 *  - aria-label on plus/minus includes "Increase"/"Decrease" + product name.
 *  - The numeric input is a real <input type=number> so mobile keypads work.
 */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { QuantityStepper } from "@/components/product/QuantityStepper";

const noop = () => {};

describe("QuantityStepper", () => {
  it("renders the provided value", () => {
    render(<QuantityStepper value={3} onChange={noop} productName="Test" />);
    expect(screen.getByTestId("qty-stepper-input")).toHaveValue(3);
  });

  it("fires onChange with value+1 on plus click", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName="Test" />);
    fireEvent.click(screen.getByTestId("qty-stepper-plus"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("fires onChange with value-1 on minus click", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} productName="Test" />);
    fireEvent.click(screen.getByTestId("qty-stepper-minus"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("disables the minus button at the minimum (default 1)", () => {
    render(<QuantityStepper value={1} onChange={noop} productName="Test" />);
    expect(screen.getByTestId("qty-stepper-minus")).toBeDisabled();
  });

  it("disables the plus button at the maximum (default 99)", () => {
    render(<QuantityStepper value={99} onChange={noop} productName="Test" />);
    expect(screen.getByTestId("qty-stepper-plus")).toBeDisabled();
  });

  it("clamps a too-high typed value to max on blur", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} productName="Test" />);
    const input = screen.getByTestId("qty-stepper-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(99);
  });

  it("clamps a too-low typed value to min on blur", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={5} onChange={onChange} productName="Test" />);
    const input = screen.getByTestId("qty-stepper-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("resets a non-numeric typed value to the last valid value on blur", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={4} onChange={onChange} productName="Test" />);
    const input = screen.getByTestId("qty-stepper-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    // onChange not called with abc — falls back to the prop value (4).
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("respects custom min/max props", () => {
    render(
      <QuantityStepper value={5} min={5} max={10} onChange={noop} productName="Test" />,
    );
    expect(screen.getByTestId("qty-stepper-minus")).toBeDisabled();
    render(
      <QuantityStepper value={10} min={5} max={10} onChange={noop} productName="Test" />,
    );
    // Both renders share the same DOM; pick the second + button.
    const plusButtons = screen.getAllByTestId("qty-stepper-plus");
    expect(plusButtons[plusButtons.length - 1]).toBeDisabled();
  });

  it("disables all three controls when disabled prop is true", () => {
    render(
      <QuantityStepper value={3} onChange={noop} productName="Test" disabled />,
    );
    expect(screen.getByTestId("qty-stepper-minus")).toBeDisabled();
    expect(screen.getByTestId("qty-stepper-plus")).toBeDisabled();
    expect(screen.getByTestId("qty-stepper-input")).toBeDisabled();
  });

  it("aria-labels include direction + product name for screen-reader context", () => {
    render(
      <QuantityStepper value={2} onChange={noop} productName="Monterey Frame" />,
    );
    expect(screen.getByTestId("qty-stepper-minus")).toHaveAttribute(
      "aria-label",
      "Decrease quantity of Monterey Frame",
    );
    expect(screen.getByTestId("qty-stepper-plus")).toHaveAttribute(
      "aria-label",
      "Increase quantity of Monterey Frame",
    );
  });

  it("uses input type=number so mobile keypads show the number pad", () => {
    render(<QuantityStepper value={1} onChange={noop} productName="Test" />);
    expect(screen.getByTestId("qty-stepper-input")).toHaveAttribute("type", "number");
  });
});

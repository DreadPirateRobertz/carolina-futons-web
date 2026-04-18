import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PdpShippingEstimate } from "@/components/product/PdpShippingEstimate";

describe("PdpShippingEstimate — 4-case truth table (ZIP format × submission state)", () => {
  // (invalid, not-submitted) — prompt only, no result, no validation noise yet
  it("renders the prompt and no result when no submission has occurred", () => {
    render(<PdpShippingEstimate />);
    expect(screen.getByRole("textbox", { name: /zip/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /estimate/i })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // (invalid, submitted) — validation message, no zone lookup, no status
  it("shows validation error when submitted with invalid ZIP", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    const input = screen.getByRole("textbox", { name: /zip/i });
    await user.type(input, "abc");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/5.digit zip/i);
    expect(screen.queryByRole("status")).toBeNull();
  });

  // (valid, not-submitted) — typed but not submitted, still prompt-only
  it("does not render a result when valid ZIP is typed but not submitted", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28801");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // (valid, submitted) — delivery window surfaced as role=status, mentions ZIP
  it("shows delivery window with role=status when submitted with valid NC ZIP", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "28801");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    const result = screen.getByRole("status");
    expect(result.textContent).toMatch(/1.2 business days/i);
    expect(result.textContent).toMatch(/28801/);
  });
});

describe("PdpShippingEstimate — zone surface checks", () => {
  it("west-coast ZIP (90210) surfaces 5-7 day window", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    await user.type(screen.getByRole("textbox", { name: /zip/i }), "90210");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    expect(screen.getByRole("status").textContent).toMatch(/5.7 business days/i);
  });

  it("resubmitting a new ZIP replaces the prior result", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    const input = screen.getByRole("textbox", { name: /zip/i });
    await user.type(input, "28801");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    expect(screen.getByRole("status").textContent).toMatch(/1.2/);
    await user.clear(input);
    await user.type(input, "90210");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    expect(screen.getByRole("status").textContent).toMatch(/5.7/);
  });

  it("switching from valid→invalid clears the prior result and surfaces alert", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    const input = screen.getByRole("textbox", { name: /zip/i });
    await user.type(input, "28801");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    expect(screen.queryByRole("status")).not.toBeNull();
    await user.clear(input);
    await user.type(input, "abc");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("PdpShippingEstimate — a11y", () => {
  it("associates the result with the input via aria-describedby after submit", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    const input = screen.getByRole("textbox", { name: /zip/i });
    await user.type(input, "28801");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const result = screen.getByRole("status");
    expect(describedBy!.split(/\s+/)).toContain(result.id);
  });

  it("associates the error with the input via aria-describedby after invalid submit", async () => {
    const user = userEvent.setup();
    render(<PdpShippingEstimate />);
    const input = screen.getByRole("textbox", { name: /zip/i });
    await user.type(input, "abc");
    await user.click(screen.getByRole("button", { name: /estimate/i }));
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const alert = screen.getByRole("alert");
    expect(describedBy!.split(/\s+/)).toContain(alert.id);
  });
});

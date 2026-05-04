import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PdpNotifyMe } from "@/components/product/PdpNotifyMe";

// Stub the server action — we test form wiring/UI states here.
// Integration tests for the action itself would live in an e2e suite.
vi.mock("@/app/actions/notify-me", () => ({
  submitNotifyMe: vi.fn(),
}));

import { submitNotifyMe } from "@/app/actions/notify-me";
const mockAction = vi.mocked(submitNotifyMe);

function renderForm(productId = "prod-123") {
  return render(<PdpNotifyMe productId={productId} />);
}

describe("PdpNotifyMe — initial render", () => {
  it("renders out-of-stock message", () => {
    renderForm();
    expect(screen.getByText(/out of stock/i)).toBeTruthy();
  });

  it("renders email input", () => {
    renderForm();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  it("renders Notify me button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /notify me/i })).toBeTruthy();
  });

  it("includes hidden productId field", () => {
    const { container } = renderForm("my-product-id");
    const hidden = container.querySelector("input[name='productId']") as HTMLInputElement;
    expect(hidden?.value).toBe("my-product-id");
  });

  it("has accessible form label", () => {
    renderForm();
    expect(
      screen.getByRole("form", { name: /back-in-stock notification/i }),
    ).toBeTruthy();
  });

  it("does not show error message initially", () => {
    renderForm();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not show success message initially", () => {
    renderForm();
    expect(screen.queryByTestId("notify-me-success")).toBeNull();
  });
});

describe("PdpNotifyMe — success state", () => {
  it("shows success message after successful submit", async () => {
    mockAction.mockResolvedValueOnce({ status: "success" });
    renderForm();
    const input = screen.getByRole("textbox", { name: /email/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByTestId("notify-me-success")).toBeTruthy();
    });
  });

  it("success message has role=status for screen readers", async () => {
    mockAction.mockResolvedValueOnce({ status: "success" });
    renderForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      const el = screen.getByTestId("notify-me-success");
      expect(el.getAttribute("role")).toBe("status");
    });
  });

  it("hides form after success", async () => {
    mockAction.mockResolvedValueOnce({ status: "success" });
    renderForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull();
    });
  });
});

describe("PdpNotifyMe — error state", () => {
  it("shows error message when action returns error", async () => {
    mockAction.mockResolvedValueOnce({
      status: "error",
      error: "That email doesn't look right.",
    });
    renderForm();
    const input = screen.getByRole("textbox", { name: /email/i });
    fireEvent.change(input, { target: { value: "bad-email" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(
        screen.getByText(/that email doesn't look right/i),
      ).toBeTruthy();
    });
  });

  it("error element has role=alert", async () => {
    mockAction.mockResolvedValueOnce({
      status: "error",
      error: "Email address is required.",
    });
    renderForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  it("form remains visible after error", async () => {
    mockAction.mockResolvedValueOnce({
      status: "error",
      error: "Could not save — please try again shortly.",
    });
    renderForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
    });
  });
});

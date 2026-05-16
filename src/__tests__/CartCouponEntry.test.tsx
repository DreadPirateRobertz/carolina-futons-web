import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const applyCouponAction = vi.fn();
const removeCouponAction = vi.fn();

vi.mock("@/app/actions/cart", () => ({
  applyCouponAction: (...args: unknown[]) => applyCouponAction(...args),
  removeCouponAction: (...args: unknown[]) => removeCouponAction(...args),
}));

// cf-5qv7: CartCouponEntry now reads appliedCoupon from useCart() and
// dispatches setAppliedCoupon/clearAppliedCoupon on success. Mock the hook
// so these unit tests don't need a real CartProvider tree.
const setAppliedCoupon = vi.fn();
const clearAppliedCoupon = vi.fn();
let mockAppliedCoupon: { code: string; discountCents: number } | undefined;

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({
    appliedCoupon: mockAppliedCoupon,
    setAppliedCoupon,
    clearAppliedCoupon,
  }),
}));

import { CartCouponEntry } from "@/components/cart/CartCouponEntry";

// cf-snil (cf-wsrr.F2): in-cart coupon entry. UI smoke for the CartDrawer
// promo-code experience. Pins the contract that a user can apply a code,
// see success feedback, remove the code, and recover from an invalid-code
// rejection.
describe("CartCouponEntry — cf-snil (cf-wsrr.F2)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAppliedCoupon = undefined;
  });

  it("starts collapsed with a 'Have a promo code?' toggle", () => {
    render(<CartCouponEntry />);
    expect(screen.getByTestId("cart-coupon-toggle")).toBeTruthy();
    expect(screen.queryByTestId("cart-coupon-input")).toBeNull();
  });

  it("expands to a form when the toggle is clicked", () => {
    render(<CartCouponEntry />);
    fireEvent.click(screen.getByTestId("cart-coupon-toggle"));
    expect(screen.getByTestId("cart-coupon-input")).toBeTruthy();
    expect(screen.getByTestId("cart-coupon-apply")).toBeTruthy();
  });

  it("Apply button is disabled while the input is empty", () => {
    render(<CartCouponEntry />);
    fireEvent.click(screen.getByTestId("cart-coupon-toggle"));
    const apply = screen.getByTestId("cart-coupon-apply") as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("cart-coupon-input"), {
      target: { value: "SUMMER15" },
    });
    expect(apply.disabled).toBe(false);
  });

  it("calls applyCouponAction with the entered code on submit", async () => {
    applyCouponAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<CartCouponEntry />);
    fireEvent.click(screen.getByTestId("cart-coupon-toggle"));
    fireEvent.change(screen.getByTestId("cart-coupon-input"), {
      target: { value: "SUMMER15" },
    });
    fireEvent.submit(screen.getByTestId("cart-coupon-entry-form"));
    await waitFor(() => {
      expect(applyCouponAction).toHaveBeenCalledWith("SUMMER15");
    });
  });

  it("shows applied state with the code on success", async () => {
    applyCouponAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<CartCouponEntry />);
    fireEvent.click(screen.getByTestId("cart-coupon-toggle"));
    fireEvent.change(screen.getByTestId("cart-coupon-input"), {
      target: { value: "SUMMER15" },
    });
    fireEvent.submit(screen.getByTestId("cart-coupon-entry-form"));
    await waitFor(() => {
      expect(screen.getByTestId("cart-coupon-applied-code").textContent).toBe(
        "SUMMER15",
      );
    });
  });

  it("surfaces the server error message on invalid code", async () => {
    applyCouponAction.mockResolvedValueOnce({
      ok: false,
      error: "Coupon code not valid",
    });
    render(<CartCouponEntry />);
    fireEvent.click(screen.getByTestId("cart-coupon-toggle"));
    fireEvent.change(screen.getByTestId("cart-coupon-input"), {
      target: { value: "BOGUS" },
    });
    fireEvent.submit(screen.getByTestId("cart-coupon-entry-form"));
    await waitFor(() => {
      expect(screen.getByTestId("cart-coupon-error").textContent).toBe(
        "Coupon code not valid",
      );
    });
    // Form stays open so the user can correct the code.
    expect(screen.getByTestId("cart-coupon-input")).toBeTruthy();
  });

  it("removes an applied code via removeCouponAction", async () => {
    removeCouponAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<CartCouponEntry initialAppliedCode="SUMMER15" />);
    fireEvent.click(screen.getByTestId("cart-coupon-remove"));
    await waitFor(() => {
      expect(removeCouponAction).toHaveBeenCalledTimes(1);
    });
    // After remove, returns to the empty form (not the collapsed toggle)
    // so the user can try a different code without an extra click.
    await waitFor(() => {
      expect(screen.getByTestId("cart-coupon-input")).toBeTruthy();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const addLine = vi.fn();
const removeLine = vi.fn();
const openCart = vi.fn();

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ addLine, removeLine, openCart }),
}));

const addItemAction = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  addItemAction: (...args: unknown[]) => addItemAction(...args),
}));

import { AddToCartButton } from "@/components/cart/AddToCartButton";

const baseProps = {
  productId: "p1",
  productName: "Test Futon",
  unitPriceCents: 79900,
  formattedUnitPrice: "$799.00",
};

describe("AddToCartButton", () => {
  beforeEach(() => {
    addLine.mockReset();
    removeLine.mockReset();
    openCart.mockReset();
    addItemAction.mockReset();
  });

  it("adds a line client-side and syncs to the server on click", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(
      <AddToCartButton
        {...baseProps}
        variantId="v1"
        variantLabel="Size: Queen"
        imageUrl="https://cdn/img.jpg"
        options={{ Size: "Queen", Color: "Oak" }}
        quantity={2}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add to cart/i }),
    );
    expect(addLine).toHaveBeenCalledWith({
      id: "p1:v1",
      productId: "p1",
      productName: "Test Futon",
      variantId: "v1",
      variantLabel: "Size: Queen",
      imageUrl: "https://cdn/img.jpg",
      productUrl: undefined,
      quantity: 2,
      unitPriceCents: 79900,
      formattedUnitPrice: "$799.00",
    });
    expect(openCart).toHaveBeenCalled();
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "p1",
      quantity: 2,
      variantId: "v1",
      options: { Size: "Queen", Color: "Oak" },
    });
  });

  it("shows pending label while awaiting the server sync", async () => {
    let resolve: (v: { ok: true; cart: null }) => void = () => {};
    addItemAction.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<AddToCartButton {...baseProps} />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(btn).toHaveTextContent("Adding…");
    expect(btn).toBeDisabled();
    resolve({ ok: true, cart: null });
  });

  it("rolls back the optimistic line when the server sync fails", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    render(<AddToCartButton {...baseProps} variantId="v1" />);
    await userEvent.click(screen.getByRole("button"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Out of stock");
    expect(removeLine).toHaveBeenCalledWith("p1:v1");
  });

  it("respects disabled prop and skips the call", async () => {
    render(
      <AddToCartButton
        {...baseProps}
        disabled
        disabledReason="Select a size"
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Select a size");
    await userEvent.click(btn);
    expect(addLine).not.toHaveBeenCalled();
    expect(addItemAction).not.toHaveBeenCalled();
  });

  it("is disabled when productId is empty", () => {
    render(<AddToCartButton {...baseProps} productId="" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // cf-pdp-sticky-cta spike: PdpStickyCta wires onAdded → dismiss to auto-hide
  // the bottom sheet once the user successfully adds. The callback must NOT
  // fire on failure — the sheet must stay open so the inline error remains
  // associated with the action that produced it.
  it("calls onAdded after a successful server sync", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    const onAdded = vi.fn();
    render(<AddToCartButton {...baseProps} onAdded={onAdded} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it("does not call onAdded when the server sync fails", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    const onAdded = vi.fn();
    render(<AddToCartButton {...baseProps} onAdded={onAdded} />);
    await userEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    expect(onAdded).not.toHaveBeenCalled();
  });
});

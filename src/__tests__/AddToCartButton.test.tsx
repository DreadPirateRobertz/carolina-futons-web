import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const addItem = vi.fn();
const clearError = vi.fn();
const storeState = {
  addItem,
  clearError,
  error: null as string | null,
};

vi.mock("@/lib/cart/store", () => ({
  useCartStore: (selector: (s: typeof storeState) => unknown) =>
    selector(storeState),
}));

import { AddToCartButton } from "@/components/cart/AddToCartButton";

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storeState.error = null;
  });

  it("renders and forwards productId + variantId + options + quantity on click", async () => {
    addItem.mockResolvedValueOnce(true);
    render(
      <AddToCartButton
        productId="p1"
        variantId="v1"
        options={{ Size: "Queen", Color: "Oak" }}
        quantity={2}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add to cart/i }),
    );
    expect(addItem).toHaveBeenCalledWith({
      productId: "p1",
      quantity: 2,
      variantId: "v1",
      options: { Size: "Queen", Color: "Oak" },
    });
  });

  it("shows pending label while awaiting addItem", async () => {
    let resolve: (v: boolean) => void = () => {};
    addItem.mockReturnValueOnce(
      new Promise<boolean>((r) => {
        resolve = r;
      }),
    );
    render(<AddToCartButton productId="p1" />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(btn).toHaveTextContent("Adding…");
    expect(btn).toBeDisabled();
    resolve(true);
  });

  it("shows error alert when addItem fails", async () => {
    storeState.error = "Out of stock";
    addItem.mockResolvedValueOnce(false);
    render(<AddToCartButton productId="p1" />);
    await userEvent.click(screen.getByRole("button"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Out of stock");
  });

  it("respects disabled prop and skips the call", async () => {
    render(
      <AddToCartButton productId="p1" disabled disabledReason="Select a size" />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Select a size");
    await userEvent.click(btn);
    expect(addItem).not.toHaveBeenCalled();
  });

  it("is disabled when productId is empty", () => {
    render(<AddToCartButton productId="" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

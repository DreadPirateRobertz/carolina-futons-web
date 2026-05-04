import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const addLine = vi.fn();
const removeLine = vi.fn();
const openCart = vi.fn();
const beginCartWrite = vi.fn();
const endCartWrite = vi.fn();

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ addLine, removeLine, openCart, beginCartWrite, endCartWrite }),
}));

const addItemAction = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  addItemAction: (...args: unknown[]) => addItemAction(...args),
}));

const fireMetaEvent = vi.fn();
vi.mock("@/components/analytics/MetaPixel", () => ({
  fireMetaEvent: (...args: unknown[]) => fireMetaEvent(...args),
}));

const trackAddToCart = vi.fn();
vi.mock("@/lib/analytics/ga4-events", () => ({
  trackAddToCart: (...args: unknown[]) => trackAddToCart(...args),
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
    beginCartWrite.mockReset();
    endCartWrite.mockReset();
    addItemAction.mockReset();
    fireMetaEvent.mockReset();
    trackAddToCart.mockReset();
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

  // cf-3qt.7.3: Meta Pixel AddToCart fires after the server confirms,
  // with value derived from unitPriceCents * quantity / 100. Failure
  // path must NOT fire, otherwise Meta would over-report AddToCart
  // events on validation errors.
  it("fires Meta AddToCart with derived value after successful server sync", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<AddToCartButton {...baseProps} quantity={2} />);
    await userEvent.click(screen.getByRole("button"));
    expect(fireMetaEvent).toHaveBeenCalledWith("AddToCart", {
      content_ids: ["p1"],
      content_type: "product",
      value: 1598, // unitPriceCents 79900 * qty 2 / 100
      currency: "USD",
      contents: [{ id: "p1", quantity: 2 }],
    });
  });

  it("does not fire Meta AddToCart when the server sync fails", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    render(<AddToCartButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    expect(fireMetaEvent).not.toHaveBeenCalled();
  });

  // cf-pzx5: GA4 add_to_cart fires after the server confirms, with the
  // GA4 ecommerce schema (item_id, item_name, item_variant, price, quantity).
  // Failure path must NOT fire, otherwise GA4 over-reports add_to_cart on
  // validation errors.
  it("fires GA4 add_to_cart with the line details after successful server sync", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(
      <AddToCartButton
        {...baseProps}
        variantLabel="Size: Queen"
        quantity={2}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(trackAddToCart).toHaveBeenCalledWith({
      item_id: "p1",
      item_name: "Test Futon",
      item_variant: "Size: Queen",
      price: 799, // unitPriceCents 79900 / 100
      quantity: 2,
    });
  });

  it("omits item_variant when no variantLabel is supplied", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<AddToCartButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button"));
    expect(trackAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ item_variant: undefined }),
    );
  });

  it("does not fire GA4 add_to_cart when the server sync fails", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    render(<AddToCartButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    expect(trackAddToCart).not.toHaveBeenCalled();
  });

  // cf-cfol: checkout race guard — beginCartWrite must bracket addItemAction
  // so CartDrawer's isCartPending is true while the SA is in flight, preventing
  // the user from navigating to /checkout before the Wix cart is committed.
  it("calls beginCartWrite before addItemAction and endCartWrite after", async () => {
    let resolveAdd!: (v: { ok: true; cart: null }) => void;
    addItemAction.mockReturnValueOnce(
      new Promise<{ ok: true; cart: null }>((r) => { resolveAdd = r; }),
    );
    render(<AddToCartButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(beginCartWrite).toHaveBeenCalledOnce();
    expect(endCartWrite).not.toHaveBeenCalled();
    resolveAdd({ ok: true, cart: null });
    await screen.findByRole("button", { name: /add to cart/i });
    expect(endCartWrite).toHaveBeenCalledOnce();
  });

  it("calls endCartWrite even when addItemAction rejects", async () => {
    addItemAction.mockRejectedValueOnce(new Error("network failure"));
    render(<AddToCartButton {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    await vi.waitFor(() => expect(endCartWrite).toHaveBeenCalledOnce());
  });
});

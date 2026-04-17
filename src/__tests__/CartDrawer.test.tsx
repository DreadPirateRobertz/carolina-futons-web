import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider, useCart } from "@/components/cart/CartProvider";
import { CartTrigger } from "@/components/cart/CartTrigger";
import type { CartLineItem } from "@/lib/cart/cart-state";

function Seed({ lines }: { lines: ReadonlyArray<CartLineItem> }) {
  const { addLine } = useCart();
  useEffect(() => {
    lines.forEach(addLine);
  }, [lines, addLine]);
  return null;
}

function renderWith(lines: ReadonlyArray<CartLineItem> = []) {
  return render(
    <CartProvider>
      <Seed lines={lines} />
      <CartTrigger />
      <CartDrawer />
    </CartProvider>,
  );
}

const lineA: CartLineItem = {
  id: "p-full",
  productId: "p-full",
  productName: "Carolina Classic Futon",
  variantId: "v-full",
  variantLabel: "Size: Full",
  imageUrl: "https://img/full.jpg",
  quantity: 1,
  unitPriceCents: 79900,
  formattedUnitPrice: "$799.00",
  productUrl: "/products/carolina-classic",
};

const lineB: CartLineItem = {
  id: "p-queen",
  productId: "p-queen",
  productName: "Blue Ridge Murphy Bed",
  quantity: 2,
  unitPriceCents: 129900,
  formattedUnitPrice: "$1,299.00",
};

describe("CartDrawer (cf-3qt.2.3)", () => {
  it("is closed by default — drawer popup is not rendered", () => {
    renderWith();
    expect(screen.queryByTestId("cart-drawer")).toBeNull();
  });

  it("opens when the CartTrigger is clicked", () => {
    renderWith();
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-drawer")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /your cart/i })).toBeInTheDocument();
  });

  it("shows the empty state CTA when there are no line items", () => {
    renderWith();
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-empty")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start shopping/i }),
    ).toHaveAttribute("href", "/shop");
  });

  it("renders one line per cart item with the running line total", () => {
    renderWith([lineA, lineB]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    const lines = screen.getAllByTestId("cart-line");
    expect(lines).toHaveLength(2);
    expect(screen.getByText(/carolina classic futon/i)).toBeInTheDocument();
    expect(screen.getByText(/blue ridge murphy bed/i)).toBeInTheDocument();
    const prices = screen.getAllByTestId("cart-line-price");
    expect(prices[0]).toHaveTextContent("$799.00"); // 79900 * 1
    expect(prices[1]).toHaveTextContent("$2,598.00"); // 129900 * 2
  });

  it("renders the subtotal across all lines", () => {
    renderWith([lineA, lineB]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("$3,397.00");
  });

  it("exposes a checkout CTA linked to /checkout", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    const cta = screen.getByTestId("cart-checkout-cta");
    expect(cta).toHaveAttribute("href", "/checkout");
    expect(cta).toHaveTextContent(/go to checkout/i);
  });

  it("increments quantity via the + button and updates subtotal", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /increase quantity of carolina classic futon/i,
      }),
    );
    expect(screen.getByTestId("cart-qty-value")).toHaveTextContent("2");
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("$1,598.00");
  });

  it("disables decrement at quantity 1 so clicks can't drop the line silently", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    const decrement = screen.getByRole("button", {
      name: /decrease quantity of carolina classic futon/i,
    });
    expect(decrement).toBeDisabled();
  });

  it("removes a line when the Remove button is clicked", () => {
    renderWith([lineA, lineB]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /remove carolina classic futon from cart/i,
      }),
    );
    expect(screen.getAllByTestId("cart-line")).toHaveLength(1);
    expect(screen.queryByText(/carolina classic futon/i)).toBeNull();
  });

  it("transitions to the empty state after removing the last line", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /remove carolina classic futon from cart/i,
      }),
    );
    expect(screen.getByTestId("cart-empty")).toBeInTheDocument();
  });

  it("closes when the Close control is activated (Escape support comes from base-ui)", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close cart/i }));
    expect(screen.queryByTestId("cart-drawer")).toBeNull();
  });

  it("exposes the drawer as role=dialog with the cart accessible name", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    const dialog = screen.getByRole("dialog", { name: /your cart/i });
    expect(dialog).toBeInTheDocument();
  });
});

describe("CartTrigger (cf-3qt.2.3)", () => {
  it("labels the button as empty when there are no lines", () => {
    renderWith();
    expect(
      screen.getByRole("button", { name: /cart \(empty\)/i }),
    ).toBeInTheDocument();
  });

  it("includes the item count in the accessible name when lines are present", () => {
    renderWith([lineA, lineB]);
    expect(
      screen.getByRole("button", { name: /cart \(3 items\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cart-trigger-count")).toHaveTextContent("3");
  });

  it("uses singular wording for a single item", () => {
    renderWith([lineA]);
    expect(
      screen.getByRole("button", { name: /cart \(1 item\)/i }),
    ).toBeInTheDocument();
  });
});

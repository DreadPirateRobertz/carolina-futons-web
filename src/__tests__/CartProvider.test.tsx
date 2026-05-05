// cfw-7so: verify CartProvider state persists across an unmount/remount of
// the provider tree. Mirrors the production failure mode where a hard nav
// from PDP to /cart remounts the React tree (and therefore the provider) and
// the in-memory cart is lost. The localStorage snapshot in CartProvider
// rehydrates the line on remount.
import { act } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";

import { CartProvider, useCart } from "@/components/cart/CartProvider";
import { CART_STORAGE_KEY } from "@/lib/cart/cart-storage";
import type { CartLineItem } from "@/lib/cart/cart-state";

const LINE: CartLineItem = {
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

function Seed({ line }: { line: CartLineItem }) {
  const { addLine } = useCart();
  useEffect(() => {
    addLine(line);
  }, [addLine, line]);
  return null;
}

function Reader() {
  const { state } = useCart();
  return (
    <ul data-testid="lines">
      {state.lines.map((l) => (
        <li key={l.id} data-testid="line" data-id={l.id}>
          {l.productName} × {l.quantity}
        </li>
      ))}
    </ul>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("CartProvider persistence (cfw-7so)", () => {
  it("hydrates state from localStorage on mount", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ lines: [LINE] }),
    );
    render(
      <CartProvider>
        <Reader />
      </CartProvider>,
    );
    // useEffect-based hydration runs after the initial render. flushSync via
    // act lets the dispatch settle before the assertion.
    await act(async () => {});
    expect(screen.getByTestId("line")).toHaveTextContent("Carolina Classic Futon × 1");
  });

  it("persists state to localStorage on every change", async () => {
    render(
      <CartProvider>
        <Seed line={LINE} />
        <Reader />
      </CartProvider>,
    );
    await act(async () => {});
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0].id).toBe(LINE.id);
  });

  it("survives an unmount and remount of the provider tree (PDP → /cart hard nav)", async () => {
    const first = render(
      <CartProvider>
        <Seed line={LINE} />
        <Reader />
      </CartProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("line")).toHaveTextContent("Carolina Classic Futon × 1");
    first.unmount();

    // Fresh render with no Seed — the only way the line returns is if the
    // provider rehydrates from localStorage.
    render(
      <CartProvider>
        <Reader />
      </CartProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("line")).toHaveTextContent("Carolina Classic Futon × 1");
  });

  it("starts empty when localStorage is empty", async () => {
    render(
      <CartProvider>
        <Reader />
      </CartProvider>,
    );
    await act(async () => {});
    expect(screen.queryByTestId("line")).toBeNull();
  });
});

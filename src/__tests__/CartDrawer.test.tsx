import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { useEffect } from "react";

const trackBeginCheckout = vi.fn();
vi.mock("@/lib/analytics/ga4-events", () => ({
  trackBeginCheckout: (...args: unknown[]) => trackBeginCheckout(...args),
}));
// Sentinel: renders Next.js Links as <a data-nextlink="true"> so tests can
// assert the checkout CTA is a plain <a> that won't drop cross-origin 307s.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} onClick={onClick} data-nextlink="true" {...rest}>
      {children}
    </a>
  ),
}));

import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider, useCart } from "@/components/cart/CartProvider";
import { CartTrigger } from "@/components/cart/CartTrigger";
import type { CartLineItem } from "@/lib/cart/cart-state";

beforeEach(() => {
  trackBeginCheckout.mockReset();
});

function Seed({ lines }: { lines: ReadonlyArray<CartLineItem> }) {
  const { addLine } = useCart();
  useEffect(() => {
    lines.forEach(addLine);
  }, [lines, addLine]);
  return null;
}

function SetPending() {
  const { beginCartWrite } = useCart();
  useEffect(() => { beginCartWrite(); }, [beginCartWrite]);
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

  it("checkout CTA is a plain <a>, not a Next.js <Link>", () => {
    // Guards against regression: <Link> silently drops cross-origin 307s to
    // the Wix-hosted payment page. The next/link sentinel mock marks all Link
    // elements with data-nextlink="true"; the checkout CTA must not carry it.
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-checkout-cta")).not.toHaveAttribute("data-nextlink");
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
    expect(screen.queryByTestId("cart-illustration")).toBeNull();
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

  it("renders a modal backdrop so outside pointer events are blocked", () => {
    // The backdrop only renders when Dialog is `modal`. Flip to
    // `modal={false}` and the backdrop stops rendering, breaking the
    // focus-trap + scroll-lock contract silently. The `cart-backdrop`
    // testid on the backdrop is the cheapest DOM-level tripwire.
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.getByTestId("cart-backdrop")).toBeInTheDocument();
  });

  it("does not close the drawer when a product link is opened in a new tab", () => {
    // ⌘-click / ctrl-click / middle-click should keep the current tab's drawer
    // open — otherwise users lose their place the moment they try to compare.
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    const productLink = screen.getByRole("link", {
      name: /carolina classic futon/i,
    });
    fireEvent.click(productLink, { metaKey: true });
    expect(screen.getByTestId("cart-drawer")).toBeInTheDocument();
  });

  it("does not close the drawer on modifier-click of the checkout CTA", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(screen.getByTestId("cart-checkout-cta"), { ctrlKey: true });
    expect(screen.getByTestId("cart-drawer")).toBeInTheDocument();
  });

  it("does not close the drawer on modifier-click of the empty-state Start Shopping link", () => {
    renderWith();
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(
      screen.getByRole("link", { name: /start shopping/i }),
      { metaKey: true },
    );
    expect(screen.getByTestId("cart-drawer")).toBeInTheDocument();
  });

  it("closes on a plain click of the checkout CTA (non-modified path still wired)", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(screen.getByTestId("cart-checkout-cta"));
    expect(screen.queryByTestId("cart-drawer")).toBeNull();
  });

  // cf-rfb6: GA4 begin_checkout fires at the moment of checkout intent
  // (clicking through to /checkout) with the full cart items[] and value.
  it("fires GA4 begin_checkout with cart lines + subtotal on a plain checkout click", () => {
    renderWith([lineA, lineB]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(screen.getByTestId("cart-checkout-cta"));
    expect(trackBeginCheckout).toHaveBeenCalledTimes(1);
    expect(trackBeginCheckout).toHaveBeenCalledWith(
      [
        {
          item_id: "p-full",
          item_name: "Carolina Classic Futon",
          item_variant: "Size: Full",
          price: 799,
          quantity: 1,
        },
        {
          item_id: "p-queen",
          item_name: "Blue Ridge Murphy Bed",
          item_variant: undefined,
          price: 1299,
          quantity: 2,
        },
      ],
      // 79900 + (129900 * 2) = 339700 cents → 3397 dollars
      3397,
    );
  });

  it("does not fire GA4 begin_checkout on a modifier-click (open-in-new-tab)", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    fireEvent.click(screen.getByTestId("cart-checkout-cta"), {
      metaKey: true,
    });
    expect(trackBeginCheckout).not.toHaveBeenCalled();
  });

  // cf-cfol: checkout race guard — while a cart write is pending (addItemAction
  // in flight) the checkout CTA must be visually disabled and block navigation
  // so the /checkout route doesn't run createCheckoutFromCurrentCart against
  // an empty Wix cart.
  it("shows 'Saving…' and blocks navigation while a cart write is pending", () => {
    const { getByTestId } = render(
      <CartProvider>
        <SetPending />
        <Seed lines={[lineA]} />
        <CartTrigger />
        <CartDrawer />
      </CartProvider>,
    );
    fireEvent.click(getByTestId("cart-trigger"));
    const cta = getByTestId("cart-checkout-cta");
    expect(cta).toHaveTextContent("Saving…");
    expect(cta).toHaveAttribute("aria-disabled", "true");
    expect(cta).toHaveClass("opacity-60");
  });

  // marugame-illustrations: Blue Ridge strip in filled cart
  it("renders the Blue Ridge cart illustration strip when items are present", () => {
    renderWith([lineA]);
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.queryByTestId("cart-illustration")).not.toBeNull();
  });

  it("does not render the cart illustration in the empty state", () => {
    renderWith();
    fireEvent.click(screen.getByTestId("cart-trigger"));
    expect(screen.queryByTestId("cart-illustration")).toBeNull();
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

describe("CartTrigger — aria-live announcer (cf-zmsq)", () => {
  function renderWithCartControl() {
    // Use a mutable object so Controls can capture the cart functions without
    // assigning to outer-scope let bindings (react-hooks/globals violation).
    const fns: {
      add: ((line: CartLineItem) => void) | null;
      remove: ((id: string) => void) | null;
    } = { add: null, remove: null };

    function Controls() {
      const { addLine, removeLine } = useCart();
      // eslint-disable-next-line react-hooks/immutability
      fns.add = addLine;
      // eslint-disable-next-line react-hooks/immutability
      fns.remove = removeLine;
      return null;
    }

    render(
      <CartProvider>
        <Controls />
        <CartTrigger />
      </CartProvider>,
    );

    return {
      add: (line: CartLineItem) => act(() => { fns.add!(line); }),
      remove: (id: string) => act(() => { fns.remove!(id); }),
    };
  }

  it("announcer is empty on initial mount with empty cart", () => {
    // The live region starts empty — no announcement until a cart mutation fires.
    // Prevents ATs from greeting users with stale count on every page load.
    renderWith([]);
    expect(screen.getByTestId("cart-trigger-announcer")).toHaveTextContent("");
  });

  it("announces plural count when item is added", () => {
    const { add } = renderWithCartControl();
    add(lineA);
    add(lineB);
    expect(screen.getByTestId("cart-trigger-announcer")).toHaveTextContent(
      "Cart updated: 3 items",
    );
  });

  it("announces singular when exactly 1 item", () => {
    const { add } = renderWithCartControl();
    add(lineA);
    expect(screen.getByTestId("cart-trigger-announcer")).toHaveTextContent(
      "Cart updated: 1 item",
    );
  });

  it("announces 'Cart is empty' when last item is removed", () => {
    const { add, remove } = renderWithCartControl();
    add(lineA);
    remove(lineA.id);
    expect(screen.getByTestId("cart-trigger-announcer")).toHaveTextContent(
      "Cart is empty",
    );
  });
});

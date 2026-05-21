import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/analytics/ga4-events", () => ({
  trackBeginCheckout: vi.fn(),
}));
vi.mock("@/components/cart/CartProvider", () => ({
  useCart: vi.fn(),
}));
// Sentinel so tests can distinguish next/link from a plain <a>
vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} onClick={onClick} {...rest} data-nextlink="true">{children}</a>
  ),
}));

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { useCart } from "@/components/cart/CartProvider";
import { trackBeginCheckout } from "@/lib/analytics/ga4-events";
import CartPage from "@/app/cart/page";
import type { CartLineItem } from "@/lib/cart/cart-state";

beforeEach(() => {
  vi.mocked(trackBeginCheckout).mockReset();
});

const removeLine = vi.fn();
const setQuantity = vi.fn();

beforeEach(() => {
  vi.mocked(trackBeginCheckout).mockReset();
});

const LINE: CartLineItem = {
  id: "line-1",
  productId: "prod-1",
  productName: "Kingston Futon Frame",
  unitPriceCents: 79900,
  formattedUnitPrice: "$799.00",
  quantity: 2,
  imageUrl: "https://img/kingston.jpg",
  productUrl: "/products/kingston",
  variantLabel: "Size: Full",
};

function mockCart(lines: CartLineItem[]) {
  const subtotalCents = lines.reduce(
    (acc, l) => acc + l.unitPriceCents * l.quantity,
    0,
  );
  (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
    state: { lines },
    itemCount: lines.reduce((a, l) => a + l.quantity, 0),
    subtotalCents,
    removeLine,
    setQuantity,
  });
}

describe("CartPage", () => {
  it("shows empty state when cart has no lines", () => {
    mockCart([]);
    render(<CartPage />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue shopping/i })).toHaveAttribute("href", "/shop");
  });

  it("renders the V3 EmptyCartIllustration in the empty state (cfw-pm3)", () => {
    mockCart([]);
    const { container } = render(<CartPage />);
    expect(
      container.querySelector("[data-slot='empty-cart-illustration']"),
    ).not.toBeNull();
  });

  it("does not render the empty illustration when the cart has items", () => {
    mockCart([LINE]);
    const { container } = render(<CartPage />);
    expect(
      container.querySelector("[data-slot='empty-cart-illustration']"),
    ).toBeNull();
  });

  it("renders the PackingBearIllustration when cart is populated (cfw-pm3)", () => {
    mockCart([LINE]);
    const { container } = render(<CartPage />);
    expect(
      container.querySelector("[data-slot='packing-bear-illustration']"),
    ).not.toBeNull();
  });

  it("does not render the packing illustration on the empty cart", () => {
    mockCart([]);
    const { container } = render(<CartPage />);
    expect(
      container.querySelector("[data-slot='packing-bear-illustration']"),
    ).toBeNull();
  });

  it("renders line items and subtotal when cart has items", () => {
    mockCart([LINE]);
    render(<CartPage />);
    expect(screen.getByText("Kingston Futon Frame")).toBeInTheDocument();
    expect(screen.getByText("Size: Full")).toBeInTheDocument();
    // 2 × $799 = $1,598
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("$1,598");
  });

  it("shows item count in heading", () => {
    mockCart([LINE]);
    render(<CartPage />);
    expect(screen.getByRole("heading", { name: /your cart/i })).toBeInTheDocument();
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it("calls removeLine when trash button is clicked", () => {
    mockCart([LINE]);
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /remove kingston/i }));
    expect(removeLine).toHaveBeenCalledWith("line-1");
  });

  it("calls setQuantity with decremented value on minus click", () => {
    mockCart([LINE]);
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /decrease quantity/i }));
    expect(setQuantity).toHaveBeenCalledWith("line-1", 1);
  });

  it("disables minus button at quantity 1", () => {
    mockCart([{ ...LINE, quantity: 1 }]);
    render(<CartPage />);
    expect(screen.getByRole("button", { name: /decrease quantity/i })).toBeDisabled();
  });

  it("proceed-to-checkout link points to /checkout", () => {
    mockCart([LINE]);
    render(<CartPage />);
    expect(screen.getByTestId("proceed-to-checkout")).toHaveAttribute("href", "/checkout");
  });

  it("proceed-to-checkout is a plain <a> not next/link — required for external 307 redirect", () => {
    // /checkout route handler issues a 307 to a Wix-hosted URL. Next.js <Link>
    // does SPA-fetch navigation and silently drops cross-origin redirects, so
    // the button MUST use a plain <a> tag (same fix as CartDrawer).
    mockCart([LINE]);
    render(<CartPage />);
    const btn = screen.getByTestId("proceed-to-checkout");
    expect(btn.getAttribute("data-nextlink")).toBeNull();
  });

  it("fires GA4 begin_checkout with cart lines + subtotal on checkout click", () => {
    // cf-o3bv.2: CartPage.tsx calls trackBeginCheckout in the checkout Link's
    // onClick. Verify the call shape mirrors CartDrawer's GA4 path.
    mockCart([LINE]);
    render(<CartPage />);
    fireEvent.click(screen.getByTestId("proceed-to-checkout"));
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledWith(
      [
        {
          item_id: "prod-1",
          item_name: "Kingston Futon Frame",
          item_variant: "Size: Full",
          price: 799,        // 79900 cents / 100
          quantity: 2,
        },
      ],
      1598,                  // 79900 * 2 cents / 100 = $1,598
    );
  });

  it("product name is a link when productUrl is set", () => {
    mockCart([LINE]);
    render(<CartPage />);
    expect(screen.getByRole("link", { name: "Kingston Futon Frame" })).toHaveAttribute(
      "href",
      "/products/kingston",
    );
  });

  it("fires trackBeginCheckout with correct item shape on proceed-to-checkout click", () => {
    mockCart([LINE]);
    render(<CartPage />);
    fireEvent.click(screen.getByTestId("proceed-to-checkout"));
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledWith(
      [
        {
          item_id: "prod-1",
          item_name: "Kingston Futon Frame",
          item_variant: "Size: Full",
          price: 799,
          quantity: 2,
        },
      ],
      // 79900 × 2 = 159800 cents → 1598 dollars
      1598,
    );
  });

  // Logger migration (cfw-logger batch 14): the trackBeginCheckout catch
  // forwards to logError so non-fatal analytics failures land in Sentry
  // with source="cart-page". The catch is sync (onClick handler), so the
  // call is `void logError(...)` — fire-and-forget, never blocks the
  // checkout link navigation.
  it("calls logError with source='cart-page' op='trackBeginCheckout' when tracking throws", () => {
    mockCart([LINE]);
    vi.mocked(trackBeginCheckout).mockImplementationOnce(() => {
      throw new Error("analytics down");
    });
    mockLogError.mockClear();
    render(<CartPage />);
    fireEvent.click(screen.getByTestId("proceed-to-checkout"));
    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [source, op] = mockLogError.mock.calls[0];
    expect(source).toBe("cart-page");
    expect(op).toBe("trackBeginCheckout");
  });

  it("passes the thrown analytics error to logError as err", () => {
    mockCart([LINE]);
    const analyticsErr = new Error("analytics down");
    vi.mocked(trackBeginCheckout).mockImplementationOnce(() => {
      throw analyticsErr;
    });
    mockLogError.mockClear();
    render(<CartPage />);
    fireEvent.click(screen.getByTestId("proceed-to-checkout"));
    expect(mockLogError.mock.calls[0][2]).toBe(analyticsErr);
  });

  it("does NOT call logError when trackBeginCheckout succeeds (happy path)", () => {
    mockCart([LINE]);
    mockLogError.mockClear();
    render(<CartPage />);
    fireEvent.click(screen.getByTestId("proceed-to-checkout"));
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

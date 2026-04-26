import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/analytics/ga4-events", () => ({
  trackBeginCheckout: vi.fn(),
}));
vi.mock("@/components/cart/CartProvider", () => ({
  useCart: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
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
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

import { useCart } from "@/components/cart/CartProvider";
import { useSearchParams } from "next/navigation";
import CartPage from "@/app/cart/page";
import type { CartLineItem } from "@/lib/cart/cart-state";

const removeLine = vi.fn();
const setQuantity = vi.fn();

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

function mockSearchParams(params: Record<string, string> = {}) {
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
    new URLSearchParams(params),
  );
}

describe("CartPage", () => {
  it("shows empty state when cart has no lines", () => {
    mockCart([]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue shopping/i })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("renders line items and subtotal when cart has items", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.getByText("Kingston Futon Frame")).toBeInTheDocument();
    expect(screen.getByText("Size: Full")).toBeInTheDocument();
    // 2 × $799.00 = $1,598.00
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("$1,598.00");
  });

  it("shows item count in heading", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.getByRole("heading", { name: /your cart/i })).toBeInTheDocument();
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it("calls removeLine when trash button is clicked", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /remove kingston/i }));
    expect(removeLine).toHaveBeenCalledWith("line-1");
  });

  it("calls setQuantity with decremented value on minus click", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /decrease quantity/i }));
    expect(setQuantity).toHaveBeenCalledWith("line-1", 1);
  });

  it("calls setQuantity with incremented value on plus click", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    expect(setQuantity).toHaveBeenCalledWith("line-1", 3);
  });

  it("disables minus button at quantity 1", () => {
    mockCart([{ ...LINE, quantity: 1 }]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.getByRole("button", { name: /decrease quantity/i })).toBeDisabled();
  });

  it("proceed-to-checkout link points to /checkout", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.getByTestId("proceed-to-checkout")).toHaveAttribute("href", "/checkout");
  });

  it("product name is a link when productUrl is set", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    expect(
      screen.getByRole("link", { name: "Kingston Futon Frame" }),
    ).toHaveAttribute("href", "/products/kingston");
  });

  it("product name renders as plain text when productUrl is absent", () => {
    mockCart([{ ...LINE, productUrl: undefined }]);
    mockSearchParams();
    render(<CartPage />);
    const el = screen.getByText("Kingston Futon Frame");
    expect(el.tagName).toBe("P");
  });

  it("renders ShoppingBag placeholder when imageUrl is absent", () => {
    mockCart([{ ...LINE, imageUrl: undefined }]);
    mockSearchParams();
    const { container } = render(<CartPage />);
    expect(container.querySelector("img")).toBeNull();
    // lucide ShoppingBag renders an svg
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows checkout error banner when checkout_error=1 is in URL", () => {
    mockCart([LINE]);
    mockSearchParams({ checkout_error: "1" });
    render(<CartPage />);
    expect(screen.getByTestId("checkout-error-banner")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("does not show error banner when checkout_error param is absent", () => {
    mockCart([LINE]);
    mockSearchParams();
    render(<CartPage />);
    expect(screen.queryByTestId("checkout-error-banner")).toBeNull();
  });
});

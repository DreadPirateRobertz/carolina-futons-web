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

import { GiftCardPicker } from "@/components/gift-cards/GiftCardPicker";
import type { WixProduct } from "@/lib/wix/products";

function makeCard(overrides: Partial<WixProduct> = {}): WixProduct {
  return {
    _id: "gc-25",
    name: "$25 Gift Card",
    slug: "gift-card-25",
    productType: "gift_card" as WixProduct["productType"],
    priceData: {
      price: 25,
      formatted: { price: "$25.00" },
    },
    ...overrides,
  } as WixProduct;
}

const cards: WixProduct[] = [
  makeCard({ _id: "gc-25", name: "$25 Gift Card", priceData: { price: 25, formatted: { price: "$25.00" } } as WixProduct["priceData"] }),
  makeCard({ _id: "gc-50", name: "$50 Gift Card", priceData: { price: 50, formatted: { price: "$50.00" } } as WixProduct["priceData"] }),
  makeCard({ _id: "gc-100", name: "$100 Gift Card", priceData: { price: 100, formatted: { price: "$100.00" } } as WixProduct["priceData"] }),
];

beforeEach(() => {
  addLine.mockReset();
  removeLine.mockReset();
  openCart.mockReset();
  addItemAction.mockReset();
});

describe("GiftCardPicker — empty state", () => {
  it("shows coming-soon message when no cards are provided", () => {
    render(<GiftCardPicker cards={[]} />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});

describe("GiftCardPicker — with cards", () => {
  it("renders a button for each denomination", () => {
    render(<GiftCardPicker cards={cards} />);
    expect(screen.getByRole("button", { name: "$25.00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$50.00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$100.00" })).toBeInTheDocument();
  });

  it("first card is selected by default", () => {
    render(<GiftCardPicker cards={cards} />);
    const firstBtn = screen.getByRole("button", { name: "$25.00" });
    expect(firstBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("selecting a different denomination updates aria-pressed", async () => {
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByRole("button", { name: "$50.00" }));
    expect(screen.getByRole("button", { name: "$50.00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "$25.00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("add-to-cart button label reflects selected price", () => {
    render(<GiftCardPicker cards={cards} />);
    expect(
      screen.getByRole("button", { name: /add .25.00 gift card to cart/i }),
    ).toBeInTheDocument();
  });

  it("calls addLine + addItemAction on add-to-cart click", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addLine).toHaveBeenCalledOnce();
    expect(addLine).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "gc-25", quantity: 1 }),
    );
    expect(addItemAction).toHaveBeenCalledWith({ productId: "gc-25", quantity: 1 });
  });

  it("opens cart on success", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(openCart).toHaveBeenCalledOnce();
  });

  it("rolls back optimistic line and shows error on server failure", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(removeLine).toHaveBeenCalledOnce();
    expect(openCart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Out of stock");
  });

  it("switching denomination clears the error state", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "$50.00" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

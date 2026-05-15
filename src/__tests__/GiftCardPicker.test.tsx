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

// ── cf-gift-g1: "send as gift" recipient meta flow ──────────────────────

describe("GiftCardPicker — send as gift (cf-gift-g1)", () => {
  it("hides the recipient form by default — buy-for-self stays one-click", () => {
    render(<GiftCardPicker cards={cards} />);
    expect(
      screen.queryByLabelText(/recipient email/i),
    ).not.toBeInTheDocument();
  });

  it("toggling 'Send as a gift' reveals recipient/sender/message/delivery fields", async () => {
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/personal message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scheduled delivery/i)).toBeInTheDocument();
  });

  it("does NOT pass customTextFields when toggle is off (parity with pre-cf-gift-g1)", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "gc-25",
      quantity: 1,
    });
  });

  it("blocks add-to-cart when toggle is on but recipient email is empty", async () => {
    addItemAction.mockResolvedValue({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    // No email entered — clicking add should NOT call addItemAction.
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addItemAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/recipient email/i);
  });

  it("passes only the filled fields as customTextFields when toggle is on", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    await userEvent.type(
      screen.getByLabelText(/recipient email/i),
      "alice@example.com",
    );
    await userEvent.type(screen.getByLabelText(/your name/i), "Bob");
    // Leave recipient name + message + delivery date empty.
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "gc-25",
      quantity: 1,
      customTextFields: [
        { title: "Recipient email", value: "alice@example.com" },
        { title: "Sender name", value: "Bob" },
      ],
    });
  });

  it("passes all 5 customTextFields when every field is filled", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    await userEvent.type(
      screen.getByLabelText(/recipient email/i),
      "alice@example.com",
    );
    await userEvent.type(
      screen.getByLabelText(/recipient name/i),
      "Alice",
    );
    await userEvent.type(screen.getByLabelText(/your name/i), "Bob");
    await userEvent.type(
      screen.getByLabelText(/personal message/i),
      "Happy birthday!",
    );
    await userEvent.type(
      screen.getByLabelText(/scheduled delivery/i),
      "2026-12-25",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "gc-25",
      quantity: 1,
      customTextFields: [
        { title: "Recipient email", value: "alice@example.com" },
        { title: "Recipient name", value: "Alice" },
        { title: "Sender name", value: "Bob" },
        { title: "Personal message", value: "Happy birthday!" },
        { title: "Scheduled delivery", value: "2026-12-25" },
      ],
    });
  });

  it("toggling off after filling clears the fields from the next add-to-cart", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<GiftCardPicker cards={cards} />);
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    await userEvent.type(
      screen.getByLabelText(/recipient email/i),
      "alice@example.com",
    );
    // User changes mind — toggles back to "for self".
    await userEvent.click(screen.getByLabelText(/send as a gift/i));
    await userEvent.click(
      screen.getByRole("button", { name: /add .25.00 gift card/i }),
    );
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "gc-25",
      quantity: 1,
    });
  });
});

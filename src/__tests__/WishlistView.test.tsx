// cfw-9vs: WishlistView contract tests.
//
// Covers the four user paths the bead lists for /wishlist:
//   1. Empty state renders the V3 illustration + "Browse the shop" CTA
//   2. Per-row qty selector drives the add-to-cart line quantity
//   3. Remove triggers an optimistic UI update and the Server Action call
//   4. Share button copies a /wishlist-share/<token> URL to clipboard
//
// CartProvider + Server Actions are stubbed so the test surface is the
// component contract — not the wider cart sync or Velo plumbing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const addLine = vi.fn();
const removeLine = vi.fn();
const openCart = vi.fn();
const beginCartWrite = vi.fn();
const endCartWrite = vi.fn();

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({
    addLine,
    removeLine,
    openCart,
    beginCartWrite,
    endCartWrite,
  }),
}));

const addItemAction = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  addItemAction: (...args: unknown[]) => addItemAction(...args),
}));

const removeFromWishlist = vi.fn();
const generateShareToken = vi.fn();
vi.mock("@/app/actions/wishlist", () => ({
  removeFromWishlist: (...args: unknown[]) => removeFromWishlist(...args),
  generateShareToken: (...args: unknown[]) => generateShareToken(...args),
}));

import { WishlistView } from "@/components/wishlist/WishlistView";
import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

const ITEM: WishlistItem = {
  id: "wl-1",
  productId: "P-1",
  name: "Monterey Futon",
  price: 299,
  priceAtAdd: 299,
  imageUrl: "https://cdn/img.jpg",
  productSlug: "monterey-futon",
  inStock: true,
  addedAt: null,
};

beforeEach(() => {
  addLine.mockReset();
  removeLine.mockReset();
  openCart.mockReset();
  beginCartWrite.mockReset();
  endCartWrite.mockReset();
  addItemAction.mockReset();
  removeFromWishlist.mockReset();
  generateShareToken.mockReset();
});

describe("WishlistView — empty state", () => {
  it("renders the empty-wishlist V3 illustration and Browse-the-shop CTA", () => {
    render(<WishlistView initialItems={[]} />);
    expect(screen.getByTestId("wishlist-page")).toHaveAttribute(
      "data-state",
      "empty",
    );
    // The V3 illustration sets a stable data-slot we can assert on.
    expect(
      document.querySelector('[data-slot="empty-wishlist-illustration"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: /browse the shop/i }),
    ).toHaveAttribute("href", "/shop");
  });
});

describe("WishlistView — populated state", () => {
  it("forwards the per-row qty selector to addItemAction on Add-to-cart", async () => {
    addItemAction.mockResolvedValueOnce({ ok: true, cart: null });
    render(<WishlistView initialItems={[ITEM]} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/quantity for monterey futon/i),
      "3",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add monterey futon to cart/i }),
    );

    expect(addLine).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "P-1",
        productName: "Monterey Futon",
        quantity: 3,
        unitPriceCents: 29900,
      }),
    );
    expect(addItemAction).toHaveBeenCalledWith({
      productId: "P-1",
      quantity: 3,
    });
    expect(openCart).toHaveBeenCalled();
  });

  it("rolls the optimistic line back when addItemAction returns ok:false", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "Stock changed" });
    render(<WishlistView initialItems={[ITEM]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /add monterey futon to cart/i }),
    );
    await waitFor(() => {
      expect(removeLine).toHaveBeenCalled();
    });
    expect(screen.getByTestId("wishlist-row-error")).toHaveTextContent(
      /stock changed/i,
    );
  });

  it("optimistically removes a row and calls removeFromWishlist", async () => {
    removeFromWishlist.mockResolvedValueOnce({ success: true });
    render(<WishlistView initialItems={[ITEM]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /remove monterey futon from wishlist/i }),
    );
    // Row disappears from the DOM before the Server Action settles.
    expect(screen.queryByText("Monterey Futon")).toBeNull();
    await waitFor(() => {
      expect(removeFromWishlist).toHaveBeenCalledWith("P-1");
    });
  });

  it("restores the row when removeFromWishlist reports failure", async () => {
    removeFromWishlist.mockResolvedValueOnce({
      success: false,
      error: "Could not remove",
    });
    render(<WishlistView initialItems={[ITEM]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /remove monterey futon from wishlist/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("Monterey Futon")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/could not remove/i);
  });
});

describe("WishlistView — share button", () => {
  it("copies a /wishlist-share/<token> URL to the clipboard", async () => {
    generateShareToken.mockResolvedValueOnce({ success: true, token: "TOK-1" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.test" },
      writable: true,
    });

    render(<WishlistView initialItems={[ITEM]} />);
    await userEvent.click(screen.getByTestId("wishlist-share-button"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "https://example.test/wishlist-share/TOK-1",
      );
    });
    expect(screen.getByTestId("wishlist-share-button")).toHaveAttribute(
      "data-state",
      "copied",
    );
  });

  it("surfaces an error state when share-token generation fails", async () => {
    generateShareToken.mockResolvedValueOnce({ success: false });
    render(<WishlistView initialItems={[ITEM]} />);
    await userEvent.click(screen.getByTestId("wishlist-share-button"));
    await waitFor(() => {
      expect(screen.getByTestId("wishlist-share-button")).toHaveAttribute(
        "data-state",
        "error",
      );
    });
  });
});

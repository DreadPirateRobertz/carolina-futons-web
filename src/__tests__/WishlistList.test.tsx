import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  removeFromWishlist: vi.fn(),
}));

vi.mock("@/app/actions/wishlist", () => ({
  removeFromWishlist: actionMocks.removeFromWishlist,
}));

import { WishlistList } from "@/components/member/WishlistList";
import type { WishlistItem } from "@/lib/wishlist/wishlist-types";

const item = (overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  id: "W-1",
  productId: "P-1",
  name: "Monterey Futon",
  price: 1299,
  priceAtAdd: 1299,
  imageUrl: "https://example.test/p1.jpg",
  productSlug: "monterey-futon",
  inStock: true,
  addedAt: "2026-04-20T10:00:00Z",
  ...overrides,
});

beforeEach(() => {
  actionMocks.removeFromWishlist.mockReset();
});

describe("<WishlistList />", () => {
  it("renders an empty-state when there are no items", () => {
    render(<WishlistList initialItems={[]} />);
    expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /browse the shop/i }),
    ).toBeInTheDocument();
  });

  it("renders one row per item with name + price", () => {
    render(
      <WishlistList
        initialItems={[
          item(),
          item({
            id: "W-2",
            productId: "P-2",
            name: "Asheville Daybed",
            price: 999,
          }),
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Monterey Futon")).toBeInTheDocument();
    expect(screen.getByText("Asheville Daybed")).toBeInTheDocument();
    expect(screen.getByText(/\$1,299/)).toBeInTheDocument();
    expect(screen.getByText(/\$999/)).toBeInTheDocument();
  });

  it("links the row title to /products/<slug>", () => {
    render(<WishlistList initialItems={[item()]} />);
    const link = screen.getByRole("link", { name: "Monterey Futon" });
    expect(link.getAttribute("href")).toBe("/products/monterey-futon");
  });

  it("falls back to /shop when productSlug is empty", () => {
    render(<WishlistList initialItems={[item({ productSlug: "" })]} />);
    const link = screen.getByRole("link", { name: "Monterey Futon" });
    expect(link.getAttribute("href")).toBe("/shop");
  });

  it("shows an Out of stock pill when inStock is false", () => {
    render(<WishlistList initialItems={[item({ inStock: false })]} />);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it("optimistically removes the row, then keeps it removed on success", async () => {
    actionMocks.removeFromWishlist.mockResolvedValueOnce({ success: true });
    render(
      <WishlistList
        initialItems={[
          item(),
          item({ id: "W-2", productId: "P-2", name: "Asheville Daybed" }),
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /remove monterey futon/i }),
    );
    expect(screen.queryByText("Monterey Futon")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(actionMocks.removeFromWishlist).toHaveBeenCalledWith("P-1");
    });
    expect(screen.queryByText("Monterey Futon")).not.toBeInTheDocument();
  });

  it("reverts the optimistic remove + surfaces an error when the action returns success:false", async () => {
    actionMocks.removeFromWishlist.mockResolvedValueOnce({
      success: false,
      error: "DB locked",
    });
    render(<WishlistList initialItems={[item()]} />);
    fireEvent.click(
      screen.getByRole("button", { name: /remove monterey futon/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("DB locked");
    });
    expect(screen.getByText("Monterey Futon")).toBeInTheDocument();
  });

  it("reverts + surfaces a generic error when the action throws", async () => {
    actionMocks.removeFromWishlist.mockRejectedValueOnce(
      new Error("network fail"),
    );
    render(<WishlistList initialItems={[item()]} />);
    fireEvent.click(
      screen.getByRole("button", { name: /remove monterey futon/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /could not remove/i,
      );
    });
    expect(screen.getByText("Monterey Futon")).toBeInTheDocument();
  });
});

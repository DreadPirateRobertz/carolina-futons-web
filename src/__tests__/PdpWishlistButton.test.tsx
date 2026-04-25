import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  addToWishlistFromPdp: vi.fn(),
}));

vi.mock("@/app/actions/wishlist", () => ({
  addToWishlistFromPdp: actionMocks.addToWishlistFromPdp,
}));

import { PdpWishlistButton } from "@/components/product/PdpWishlistButton";

const baseProps = {
  productId: "P-1",
  productName: "Monterey Futon",
  price: 1299,
  productSlug: "monterey-futon",
  imageUrl: "https://example.test/p1.jpg",
};

const originalLocation = window.location;
const originalFetch = global.fetch;

beforeEach(() => {
  actionMocks.addToWishlistFromPdp.mockReset();
  // jsdom doesn't allow direct assignment to window.location.href; replace
  // the whole object with a stub that captures the assignment.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  global.fetch = originalFetch;
});

describe("<PdpWishlistButton />", () => {
  it("renders an idle Save button labelled with the product name", () => {
    render(<PdpWishlistButton {...baseProps} />);
    const btn = screen.getByRole("button", {
      name: /save monterey futon to wishlist/i,
    });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.getAttribute("data-state")).toBe("idle");
  });

  it("calls addToWishlistFromPdp with the product details on click", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({ success: true });
    render(<PdpWishlistButton {...baseProps} variantId="V-7" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(actionMocks.addToWishlistFromPdp).toHaveBeenCalledWith(
        "P-1",
        "Monterey Futon",
        1299,
        { variantId: "V-7", image: "https://example.test/p1.jpg" },
      );
    });
  });

  it("flips to Saved state with aria-pressed=true on success", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({ success: true });
    render(<PdpWishlistButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.getAttribute("aria-pressed")).toBe("true");
      expect(btn.getAttribute("data-state")).toBe("added");
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("does not re-invoke the action when clicked twice in the added state", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({ success: true });
    render(<PdpWishlistButton {...baseProps} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn.getAttribute("aria-pressed")).toBe("true");
    });
    fireEvent.click(btn);
    expect(actionMocks.addToWishlistFromPdp).toHaveBeenCalledTimes(1);
  });

  it("surfaces the error message when the action returns success:false with a reason", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({
      success: false,
      error: "Wishlist full",
    });
    render(<PdpWishlistButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Wishlist full");
    });
    // Button stays in error state, NOT added.
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("kicks off the OAuth round-trip when requiresAuth is true", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({
      success: false,
      requiresAuth: true,
    });
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ authUrl: "https://wix.example/auth" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    render(<PdpWishlistButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(window.location.href).toBe("https://wix.example/auth");
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("/products/monterey-futon"),
      }),
    );
  });

  it("falls back to /account?return_to=... when the auth init fails", async () => {
    actionMocks.addToWishlistFromPdp.mockResolvedValueOnce({
      success: false,
      requiresAuth: true,
    });
    global.fetch = vi.fn(async () =>
      new Response("nope", { status: 500 }),
    ) as typeof fetch;
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdpWishlistButton {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(window.location.href).toContain("/account?return_to=");
    });
    expect(window.location.href).toContain(
      encodeURIComponent("/products/monterey-futon"),
    );
    errSpy.mockRestore();
  });
});

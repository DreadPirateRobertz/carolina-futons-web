import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchQuickViewProduct = vi.fn();
vi.mock("@/app/actions/quick-view", () => ({
  fetchQuickViewProduct: (...args: unknown[]) => fetchQuickViewProduct(...args),
}));

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

vi.mock("@/components/analytics/MetaPixel", () => ({
  fireMetaEvent: vi.fn(),
}));
vi.mock("@/lib/analytics/ga4-events", () => ({
  trackAddToCart: vi.fn(),
}));

import { QuickViewModal } from "@/components/product/QuickViewModal";

const SIMPLE_PRODUCT = {
  _id: "prod-1",
  slug: "rio-futon",
  name: "Rio Futon",
  priceData: {
    price: 799,
    currency: "USD",
    formatted: { price: "$799.00" },
  },
  productOptions: [],
  variants: [],
  media: { mainMedia: { image: { url: "https://example.com/rio.jpg" } } },
};

beforeEach(() => {
  fetchQuickViewProduct.mockReset();
  addItemAction.mockReset();
  // jsdom 22+ ships <dialog> with a passable showModal() shim, but we stub
  // both methods to a no-op so the React effects can run without DOMException.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

describe("QuickViewModal", () => {
  it("renders a Quick view trigger", () => {
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    expect(
      screen.getByRole("button", { name: /quick view/i }),
    ).toBeInTheDocument();
  });

  it("exposes the quick-view-modal-trigger data slot", () => {
    const { container } = render(
      <QuickViewModal productSlug="rio-futon" productName="Rio Futon" />,
    );
    expect(
      container.querySelector('[data-slot="quick-view-modal-trigger"]'),
    ).not.toBeNull();
  });

  it("trigger has aria-haspopup=dialog", () => {
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    expect(
      screen.getByRole("button", { name: /quick view/i }),
    ).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("renders a dialog labelled by the product title", () => {
    const { container } = render(
      <QuickViewModal productSlug="rio-futon" productName="Rio Futon" />,
    );
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("does not fetch product data until opened", () => {
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    expect(fetchQuickViewProduct).not.toHaveBeenCalled();
  });

  it("fetches with the slug when the trigger is clicked", async () => {
    fetchQuickViewProduct.mockResolvedValue({
      ok: true,
      product: SIMPLE_PRODUCT,
    });
    const user = userEvent.setup();
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    await waitFor(() => {
      expect(fetchQuickViewProduct).toHaveBeenCalledWith("rio-futon");
    });
  });

  it("shows a loading slot while the fetch is in flight", async () => {
    let resolve: (v: unknown) => void = () => {};
    fetchQuickViewProduct.mockImplementation(
      () => new Promise((r) => (resolve = r)),
    );
    const user = userEvent.setup();
    const { container } = render(
      <QuickViewModal productSlug="rio-futon" productName="Rio Futon" />,
    );
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    expect(
      container.querySelector('[data-slot="quick-view-loading"]'),
    ).not.toBeNull();
    resolve({ ok: true, product: SIMPLE_PRODUCT });
  });

  it("shows the price + add-to-cart after a successful fetch", async () => {
    fetchQuickViewProduct.mockResolvedValue({
      ok: true,
      product: SIMPLE_PRODUCT,
    });
    const user = userEvent.setup();
    const { container } = render(
      <QuickViewModal productSlug="rio-futon" productName="Rio Futon" />,
    );
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    await waitFor(() => {
      expect(
        container.querySelector('[data-slot="quick-view-details"]'),
      ).not.toBeNull();
    });
    const priceSlot = container.querySelector(
      '[data-slot="quick-view-price"]',
    );
    expect(priceSlot?.textContent).toBe("$799.00");
  });

  it("renders an error slot with retry on a failed fetch", async () => {
    fetchQuickViewProduct.mockResolvedValueOnce({
      ok: false,
      error: "fetch_failed",
    });
    const user = userEvent.setup();
    const { container } = render(
      <QuickViewModal productSlug="rio-futon" productName="Rio Futon" />,
    );
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    await waitFor(() => {
      expect(
        container.querySelector('[data-slot="quick-view-error"]'),
      ).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retry re-invokes the server action", async () => {
    fetchQuickViewProduct
      .mockResolvedValueOnce({ ok: false, error: "fetch_failed" })
      .mockResolvedValueOnce({ ok: true, product: SIMPLE_PRODUCT });
    const user = userEvent.setup();
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() =>
      expect(fetchQuickViewProduct).toHaveBeenCalledTimes(2),
    );
  });

  it("close button has an accessible label once the dialog is open", async () => {
    fetchQuickViewProduct.mockResolvedValue({
      ok: true,
      product: SIMPLE_PRODUCT,
    });
    const user = userEvent.setup();
    render(<QuickViewModal productSlug="rio-futon" productName="Rio Futon" />);
    await user.click(screen.getByRole("button", { name: /quick view/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /close quick view/i }),
      ).toBeInTheDocument(),
    );
  });
});

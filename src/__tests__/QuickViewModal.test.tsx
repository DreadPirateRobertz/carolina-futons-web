import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuickViewModal } from "@/components/product/QuickViewModal";

vi.mock("@/app/actions/quick-view", () => ({
  getQuickViewProductData: vi.fn(),
}));

import { getQuickViewProductData } from "@/app/actions/quick-view";
const mockedFetch = vi.mocked(getQuickViewProductData);

beforeEach(() => {
  mockedFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QuickViewModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <QuickViewModal
        open={false}
        slug="kingston-futon-frame"
        productName="Kingston"
        onClose={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("fetches and renders product data when opened", async () => {
    mockedFetch.mockResolvedValueOnce({
      productId: "p1",
      slug: "kingston-futon-frame",
      name: "Kingston Futon Frame",
      description: "A classic hardwood futon frame.",
      imageUrl: "https://example.com/img.jpg",
      priceText: "$399.00",
      inStock: true,
      colorChoices: [
        { label: "Natural", hex: "#D4B896" },
        { label: "Espresso", hex: "#3A2518" },
      ],
    });

    render(
      <QuickViewModal
        open={true}
        slug="kingston-futon-frame"
        productName="Kingston Futon Frame"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Kingston Futon Frame")).toBeInTheDocument();
    });
    expect(screen.getByText("$399.00")).toBeInTheDocument();
    expect(screen.getByText("2 colors")).toBeInTheDocument();
    expect(screen.getByText(/View full details/)).toHaveAttribute(
      "href",
      "/products/kingston-futon-frame",
    );
    expect(mockedFetch).toHaveBeenCalledWith("kingston-futon-frame");
  });

  it("shows an error state when the fetch returns null", async () => {
    mockedFetch.mockResolvedValueOnce(null);
    render(
      <QuickViewModal open={true} slug="missing" productName="Missing" onClose={() => {}} />,
    );
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load this product/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when the close button is clicked", async () => {
    mockedFetch.mockResolvedValueOnce({
      productId: "p1",
      slug: "k",
      name: "K",
      description: "",
      imageUrl: null,
      priceText: "$1",
      inStock: true,
      colorChoices: [],
    });
    const onClose = vi.fn();
    render(
      <QuickViewModal open={true} slug="k" productName="K" onClose={onClose} />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /close quick view/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    mockedFetch.mockResolvedValueOnce({
      productId: "p1",
      slug: "k",
      name: "K",
      description: "",
      imageUrl: null,
      priceText: "$1",
      inStock: true,
      colorChoices: [],
    });
    const onClose = vi.fn();
    render(
      <QuickViewModal open={true} slug="k" productName="K" onClose={onClose} />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces 'Out of stock' when inStock is false", async () => {
    mockedFetch.mockResolvedValueOnce({
      productId: "p1",
      slug: "oos",
      name: "OOS Item",
      description: "",
      imageUrl: null,
      priceText: "$1",
      inStock: false,
      colorChoices: [],
    });
    render(
      <QuickViewModal
        open={true}
        slug="oos"
        productName="OOS Item"
        onClose={() => {}}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument(),
    );
  });

  it("does not refetch when reopened with the same slug", async () => {
    mockedFetch.mockResolvedValue({
      productId: "p1",
      slug: "k",
      name: "K",
      description: "",
      imageUrl: null,
      priceText: "$1",
      inStock: true,
      colorChoices: [],
    });
    const { rerender } = render(
      <QuickViewModal open={true} slug="k" productName="K" onClose={() => {}} />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    rerender(
      <QuickViewModal open={false} slug="k" productName="K" onClose={() => {}} />,
    );
    rerender(
      <QuickViewModal open={true} slug="k" productName="K" onClose={() => {}} />,
    );
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

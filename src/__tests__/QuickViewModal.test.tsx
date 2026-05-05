import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuickViewModal } from "@/components/product/QuickViewModal";
import type { QuickViewProduct } from "@/app/actions/quick-view";

function makeFetcher(result: QuickViewProduct | null) {
  return vi.fn().mockResolvedValue(result);
}

const SAMPLE: QuickViewProduct = {
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
};

describe("QuickViewModal", () => {
  it("renders nothing when closed", () => {
    const fetcher = makeFetcher(SAMPLE);
    const { container } = render(
      <QuickViewModal
        open={false}
        slug="kingston-futon-frame"
        productName="Kingston"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches and renders product data when opened", async () => {
    const fetcher = makeFetcher(SAMPLE);
    render(
      <QuickViewModal
        open={true}
        slug="kingston-futon-frame"
        productName="Kingston Futon Frame"
        onClose={() => {}}
        fetchProduct={fetcher}
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
    expect(fetcher).toHaveBeenCalledWith("kingston-futon-frame");
  });

  it("shows an error state when the fetch returns null", async () => {
    const fetcher = makeFetcher(null);
    render(
      <QuickViewModal
        open={true}
        slug="missing"
        productName="Missing"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load this product/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the fetch rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    render(
      <QuickViewModal
        open={true}
        slug="boom"
        productName="Boom"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load this product/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const fetcher = makeFetcher({ ...SAMPLE, name: "K", colorChoices: [] });
    render(
      <QuickViewModal
        open={true}
        slug="k"
        productName="K"
        onClose={onClose}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /close quick view/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const fetcher = makeFetcher({ ...SAMPLE, name: "K", colorChoices: [] });
    render(
      <QuickViewModal
        open={true}
        slug="k"
        productName="K"
        onClose={onClose}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces 'Out of stock' when inStock is false", async () => {
    const fetcher = makeFetcher({
      ...SAMPLE,
      slug: "oos",
      name: "OOS Item",
      inStock: false,
      colorChoices: [],
    });
    render(
      <QuickViewModal
        open={true}
        slug="oos"
        productName="OOS Item"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument(),
    );
  });

  it("does not refetch when reopened with the same slug", async () => {
    const fetcher = makeFetcher({ ...SAMPLE, name: "K", colorChoices: [] });
    const { rerender } = render(
      <QuickViewModal
        open={true}
        slug="k"
        productName="K"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    await waitFor(() => expect(screen.getByText("K")).toBeInTheDocument());
    rerender(
      <QuickViewModal
        open={false}
        slug="k"
        productName="K"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    rerender(
      <QuickViewModal
        open={true}
        slug="k"
        productName="K"
        onClose={() => {}}
        fetchProduct={fetcher}
      />,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

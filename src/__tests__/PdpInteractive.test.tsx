import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({
    addLine: vi.fn(),
    removeLine: vi.fn(),
    openCart: vi.fn(),
  }),
}));

vi.mock("@/app/actions/cart", () => ({
  addItemAction: vi.fn().mockResolvedValue({ ok: true, cart: null }),
}));

import { PdpInteractive } from "@/components/product/PdpInteractive";
import type {
  ProductOptionInput,
  VariantInput,
} from "@/lib/product/variant-selection";

const productOptions: ProductOptionInput[] = [
  {
    name: "Size",
    choices: [
      { value: "Full", description: "Full" },
      { value: "Queen", description: "Queen" },
    ],
  },
];

const variants: VariantInput[] = [
  {
    _id: "v-full",
    choices: { Size: "Full" },
    variant: { priceData: { formatted: { price: "$799" } } },
    stock: { inStock: true },
    media: { mainMedia: { image: { url: "https://img/full.jpg" } } },
  },
  {
    _id: "v-queen",
    choices: { Size: "Queen" },
    variant: { priceData: { formatted: { price: "$999" } } },
    stock: { inStock: true },
    media: { mainMedia: { image: { url: "https://img/queen.jpg" } } },
  },
];

const baseProps = {
  productId: "prod-1",
  productSlug: "carolina-classic",
  fallbackPriceCents: 79900,
};

describe("PdpInteractive (cf-3qt.2.1 + 2.2 integration)", () => {
  it("renders product name, picker, and the fallback image", () => {
    render(
      <PdpInteractive
        {...baseProps}
        productName="Carolina Classic Futon"
        productOptions={productOptions}
        variants={variants}
        fallbackImageUrl="https://img/fallback.jpg"
        fallbackPrice="from $799"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /carolina classic futon/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /size/i })).toBeInTheDocument();
    expect(screen.getByTestId("pdp-main-image")).toHaveAttribute(
      "src",
      "https://img/full.jpg",
    );
  });

  it("swaps the main image when the selected variant changes", () => {
    render(
      <PdpInteractive
        {...baseProps}
        productName="Carolina Classic Futon"
        productOptions={productOptions}
        variants={variants}
        fallbackImageUrl="https://img/fallback.jpg"
        fallbackPrice="from $799"
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /size: queen/i }));
    expect(screen.getByTestId("pdp-main-image")).toHaveAttribute(
      "src",
      "https://img/queen.jpg",
    );
  });

  it("renders the AddToCart button", () => {
    render(
      <PdpInteractive
        {...baseProps}
        productName="x"
        productOptions={[]}
        variants={[]}
        fallbackImageUrl={undefined}
        fallbackPrice="$0"
      />,
    );
    expect(
      screen.getByRole("button", { name: /add to cart/i }),
    ).toBeInTheDocument();
  });

  it("renders the sand placeholder when no image is available", () => {
    const { container } = render(
      <PdpInteractive
        {...baseProps}
        productName="x"
        productOptions={[]}
        variants={[]}
        fallbackImageUrl={undefined}
        fallbackPrice="$0"
      />,
    );
    expect(container.querySelector('[data-slot="pdp-media"] .bg-cf-sand')).not.toBeNull();
    expect(screen.queryByTestId("pdp-main-image")).toBeNull();
  });

  describe("sticky CTA (cf-3qt.6.F.3)", () => {
    function stubIntersectionObserver() {
      const callbacks: IntersectionObserverCallback[] = [];
      const ObserverStub = vi.fn().mockImplementation(function (
        this: IntersectionObserver,
        cb: IntersectionObserverCallback,
      ) {
        callbacks.push(cb);
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        this.unobserve = vi.fn();
        this.takeRecords = vi.fn(() => []);
        return this;
      });
      vi.stubGlobal("IntersectionObserver", ObserverStub);
      return {
        fire(intersecting: boolean) {
          for (const cb of callbacks) {
            cb(
              [{ isIntersecting: intersecting } as IntersectionObserverEntry],
              {} as IntersectionObserver,
            );
          }
        },
      };
    }

    it("hides the sticky bar on initial paint (primary CTA visible)", () => {
      stubIntersectionObserver();
      render(
        <PdpInteractive
          {...baseProps}
          productName="Kingston"
          productOptions={[]}
          variants={[]}
          fallbackImageUrl={undefined}
          fallbackPrice="$899"
        />,
      );
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
    });

    it("shows the sticky bar after the primary CTA scrolls out of view", () => {
      const observer = stubIntersectionObserver();
      render(
        <PdpInteractive
          {...baseProps}
          productName="Kingston"
          productOptions={[]}
          variants={[]}
          fallbackImageUrl={undefined}
          fallbackPrice="$899"
        />,
      );
      act(() => observer.fire(false));
      const region = screen.getByRole("region", { name: /quick add to cart/i });
      expect(region).toBeInTheDocument();
      // Both the primary and sticky bar render an AddToCartButton — the sticky
      // uses the same prop bundle so the cart action is identical.
      expect(screen.getAllByRole("button", { name: /add to cart/i })).toHaveLength(2);
    });

    it("hides the sticky bar again when the primary CTA scrolls back into view", () => {
      const observer = stubIntersectionObserver();
      render(
        <PdpInteractive
          {...baseProps}
          productName="Kingston"
          productOptions={[]}
          variants={[]}
          fallbackImageUrl={undefined}
          fallbackPrice="$899"
        />,
      );
      act(() => observer.fire(false));
      expect(
        screen.getByRole("region", { name: /quick add to cart/i }),
      ).toBeInTheDocument();
      act(() => observer.fire(true));
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
    });
  });
});

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

  it("primary CTA slot contains both AddToCart and wishlist buttons (P1 alignment fix)", () => {
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
    const slot = container.querySelector('[data-slot="pdp-primary-cta"]');
    expect(slot).not.toBeNull();
    // AddToCartButton wrapper must have flex-1 so it doesn't consume the full row
    const atcWrapper = slot!.querySelector('div.flex-1');
    expect(atcWrapper).not.toBeNull();
    // Wishlist button must live inside the same slot (not pushed outside by a block div)
    const wishlistSlot = slot!.querySelector('[data-slot="pdp-wishlist"]');
    expect(wishlistSlot).not.toBeNull();
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
      const instances: Array<{ disconnect: ReturnType<typeof vi.fn> }> = [];
      const ObserverStub = vi.fn().mockImplementation(function (
        this: IntersectionObserver,
        cb: IntersectionObserverCallback,
      ) {
        callbacks.push(cb);
        const disconnect = vi.fn();
        this.observe = vi.fn();
        this.disconnect = disconnect;
        this.unobserve = vi.fn();
        this.takeRecords = vi.fn(() => []);
        instances.push({ disconnect });
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
        instances,
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

    it("renders without crashing when IntersectionObserver is unavailable (SSR / old browsers)", () => {
      vi.stubGlobal("IntersectionObserver", undefined);
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
      // Primary CTA renders, sticky stays hidden (primaryInView seeds true).
      expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
      vi.unstubAllGlobals();
    });

    it("disconnects the observer on unmount", () => {
      const observer = stubIntersectionObserver();
      const { unmount } = render(
        <PdpInteractive
          {...baseProps}
          productName="Kingston"
          productOptions={[]}
          variants={[]}
          fallbackImageUrl={undefined}
          fallbackPrice="$899"
        />,
      );
      expect(observer.instances).toHaveLength(1);
      unmount();
      expect(observer.instances[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it("sticky CTA click invokes the same cart action as the primary CTA (shared props)", async () => {
      const { addItemAction } = await import("@/app/actions/cart");
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
      const buttons = screen.getAllByRole("button", { name: /add to cart/i });
      expect(buttons).toHaveLength(2);
      // Second button is the one inside the sticky region.
      const stickyButton = buttons[1];
      fireEvent.click(stickyButton);
      // The click fires the same server action the primary CTA uses.
      expect(addItemAction).toHaveBeenCalled();
    });
  });
});

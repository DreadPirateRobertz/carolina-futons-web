import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// cf-3qt.7.M.3: mobile bottom-sheet upgrade. Reduced-motion is consumed via
// framer-motion's useReducedMotion — we mock it so we can exercise both the
// motion branch (m.div wrapper) and the reduced branch (plain div) without
// flipping jsdom matchMedia.
const mockUseReducedMotion = vi.fn<() => boolean | null>();
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { PdpStickyCta } from "@/components/product/PdpStickyCta";

beforeEach(() => {
  mockUseReducedMotion.mockReset();
  mockUseReducedMotion.mockReturnValue(false);
});

describe("PdpStickyCta", () => {
  it("renders nothing when visible=false", () => {
    const { container } = render(
      <PdpStickyCta visible={false} productName="Kingston Futon" formattedPrice="$899">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a labeled region with name, price, and children when visible=true", () => {
    render(
      <PdpStickyCta visible productName="Kingston Futon" formattedPrice="$899">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    // Labelled region so screen readers associate the sticky bar with its purpose.
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    expect(region).toBeTruthy();
    expect(screen.getByText("Kingston Futon")).toBeTruthy();
    expect(screen.getByText("$899")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeTruthy();
  });

  it("is hidden on print media (data-slot for targeting)", () => {
    render(
      <PdpStickyCta visible productName="x" formattedPrice="$1">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    // Contract: the slot is marked so PDP smoke tests + print CSS can target it.
    expect(region.getAttribute("data-slot")).toBe("pdp-sticky-cta");
    expect(region.className).toContain("print:hidden");
  });

  it("uses fixed positioning with safe-area inset padding on mobile", () => {
    // Contract: sticky bar must respect iOS home-indicator safe area so the CTA
    // does not sit under the notch/indicator on mobile Safari.
    render(
      <PdpStickyCta visible productName="x" formattedPrice="$1">
        <button>Add to cart</button>
      </PdpStickyCta>,
    );
    const region = screen.getByRole("region", { name: /quick add to cart/i });
    expect(region.className).toContain("fixed");
    expect(region.className).toContain("safe-area-inset-bottom");
  });

  describe("cf-3qt.7.M.3 mobile bottom-sheet upgrade", () => {
    it("applies bottom-sheet classes (rounded-t, shadow) scoped to mobile only", () => {
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const region = screen.getByRole("region", { name: /quick add to cart/i });
      // Mobile default: rounded-top sheet + elevation.
      expect(region.className).toContain("rounded-t-xl");
      expect(region.className).toContain("shadow-lg");
      // Desktop overrides flatten the sheet back to the cf-3qt.6.F.3 bar surface.
      expect(region.className).toContain("md:rounded-none");
    });

    it("renders a drag handle on mobile for the swipe-to-dismiss affordance", () => {
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const handle = screen.getByTestId("pdp-sticky-drag-handle");
      expect(handle).toBeTruthy();
      // md:hidden — desktop doesn't need the grab affordance.
      expect(handle.className).toContain("md:hidden");
    });

    it("renders a quantity stepper with +/- controls and the current value", () => {
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const stepper = screen.getByTestId("pdp-sticky-qty");
      expect(stepper).toBeTruthy();
      expect(screen.getByRole("button", { name: /decrease quantity/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /increase quantity/i })).toBeTruthy();
      // Seeds to 1 so a first-tap on + goes straight to a useful state.
      expect(screen.getByLabelText(/quantity: 1/i)).toBeTruthy();
    });

    it("increments and decrements the quantity when the stepper is clicked", () => {
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const inc = screen.getByRole("button", { name: /increase quantity/i });
      const dec = screen.getByRole("button", { name: /decrease quantity/i });
      fireEvent.click(inc);
      fireEvent.click(inc);
      expect(screen.getByLabelText(/quantity: 3/i)).toBeTruthy();
      fireEvent.click(dec);
      expect(screen.getByLabelText(/quantity: 2/i)).toBeTruthy();
    });

    it("disables the decrement button when quantity is 1 (minimum)", () => {
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const dec = screen.getByRole("button", {
        name: /decrease quantity/i,
      }) as HTMLButtonElement;
      expect(dec.disabled).toBe(true);
      // Clicking it while disabled should not underflow.
      fireEvent.click(dec);
      expect(screen.getByLabelText(/quantity: 1/i)).toBeTruthy();
    });

    it("passes the current quantity to render-prop children so the cart action sees the stepper value", () => {
      const seenQuantities: number[] = [];
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          {(qty) => {
            seenQuantities.push(qty);
            return <button>Add to cart ({qty})</button>;
          }}
        </PdpStickyCta>,
      );
      // Initial render + a bump to qty=2 both land in the history.
      expect(seenQuantities[0]).toBe(1);
      fireEvent.click(
        screen.getByRole("button", { name: /increase quantity/i }),
      );
      expect(screen.getByRole("button", { name: /add to cart \(2\)/i })).toBeTruthy();
    });

    it("dismisses the sheet when a swipe-down pointer drag exceeds the threshold", () => {
      render(
        <PdpStickyCta visible productName="Kingston" formattedPrice="$899">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const handle = screen.getByTestId("pdp-sticky-drag-handle");
      // 200px delta is comfortably above the 80px threshold.
      fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientY: 300, pointerId: 1 });
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
    });

    it("does not dismiss on a short pointer drag below the swipe threshold", () => {
      render(
        <PdpStickyCta visible productName="Kingston" formattedPrice="$899">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const handle = screen.getByTestId("pdp-sticky-drag-handle");
      fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientY: 130, pointerId: 1 });
      expect(
        screen.getByRole("region", { name: /quick add to cart/i }),
      ).toBeInTheDocument();
    });

    it("re-shows the sheet after dismiss when visible flips false → true again", () => {
      const { rerender } = render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const handle = screen.getByTestId("pdp-sticky-drag-handle");
      fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientY: 200, pointerId: 1 });
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
      // Primary CTA re-enters view then exits again — visible toggles off/on.
      rerender(
        <PdpStickyCta visible={false} productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      rerender(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      expect(
        screen.getByRole("region", { name: /quick add to cart/i }),
      ).toBeInTheDocument();
    });

    // cf-pdp-sticky-cta spike: dismiss-on-cart-add. The render-prop receives a
    // `dismiss` callback so the consumer (PdpInteractive wires it to
    // AddToCartButton.onAdded) can hide the sheet immediately on a successful
    // add without lifting dismiss state up to the PDP.
    it("dismisses when the render-prop dismiss callback is invoked", () => {
      render(
        <PdpStickyCta visible productName="Kingston" formattedPrice="$899">
          {(_qty, dismiss) => (
            <button onClick={dismiss}>Add to cart</button>
          )}
        </PdpStickyCta>,
      );
      fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
    });

    it("re-shows after a callback dismiss when visible flips false → true", () => {
      const renderTree = (visible: boolean) => (
        <PdpStickyCta visible={visible} productName="x" formattedPrice="$1">
          {(_qty, dismiss) => (
            <button onClick={dismiss}>Add to cart</button>
          )}
        </PdpStickyCta>
      );
      const { rerender } = render(renderTree(true));
      fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
      expect(
        screen.queryByRole("region", { name: /quick add to cart/i }),
      ).toBeNull();
      // Primary CTA scrolls back into view, then out again — the callback
      // dismiss should reset the same way swipe dismiss already does.
      rerender(renderTree(false));
      rerender(renderTree(true));
      expect(
        screen.getByRole("region", { name: /quick add to cart/i }),
      ).toBeInTheDocument();
    });

    it("renders a plain div (no inline transform) when prefers-reduced-motion is set", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <PdpStickyCta visible productName="x" formattedPrice="$1">
          <button>Add to cart</button>
        </PdpStickyCta>,
      );
      const region = screen.getByRole("region", { name: /quick add to cart/i });
      // m.div would apply an initial translateY inline; reduced branch must not.
      expect(region.style.transform).toBe("");
    });
  });
});

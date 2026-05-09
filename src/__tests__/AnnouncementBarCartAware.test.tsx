import { useEffect } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { CartProvider, useCart } from "@/components/cart/CartProvider";
import {
  AnnouncementBarCartAware,
  announcementMessage,
  FREE_DELIVERY_THRESHOLD_CENTS,
  ROTATION_MESSAGES,
  ROTATION_INTERVAL_MS,
} from "@/components/site/AnnouncementBarCartAware";

afterEach(() => vi.useRealTimers());

// ── announcementMessage (pure function) ────────────────────────────

describe("announcementMessage", () => {
  it("returns the static prompt when the cart is empty", () => {
    expect(announcementMessage(0)).toMatch(
      /free white-glove delivery on orders over \$1,500/i,
    );
  });

  it("returns the static prompt for a negative subtotal (defensive)", () => {
    expect(announcementMessage(-5000)).toMatch(/free white-glove delivery on/i);
  });

  it("returns progress copy when the subtotal is below the threshold", () => {
    expect(announcementMessage(49_900)).toBe(
      "You're $1,001.00 away from free white-glove delivery",
    );
  });

  it("rounds the remainder to a sensible currency string", () => {
    expect(announcementMessage(149_999)).toBe(
      "You're $0.01 away from free white-glove delivery",
    );
  });

  it("returns the qualified copy at the threshold", () => {
    expect(announcementMessage(FREE_DELIVERY_THRESHOLD_CENTS)).toMatch(
      /you qualify/i,
    );
  });

  it("returns the qualified copy above the threshold", () => {
    expect(announcementMessage(FREE_DELIVERY_THRESHOLD_CENTS + 50_000)).toMatch(
      /you qualify/i,
    );
  });
});

// ── ROTATION_MESSAGES ──────────────────────────────────────────────

describe("ROTATION_MESSAGES", () => {
  it("contains exactly 5 messages", () => {
    expect(ROTATION_MESSAGES).toHaveLength(5);
  });

  it("starts with the free-delivery static prompt", () => {
    expect(ROTATION_MESSAGES[0]).toMatch(/free white-glove delivery/i);
  });

  it("every message is a non-empty string", () => {
    for (const msg of ROTATION_MESSAGES) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(5);
    }
  });
});

// ── test helpers ───────────────────────────────────────────────────

function CartSeeder({ unitPriceCents }: { unitPriceCents: number }) {
  const { addLine } = useCart();
  useEffect(() => {
    if (unitPriceCents > 0) {
      addLine({
        id: "seed",
        productId: "seed-product",
        productName: "Seed Item",
        unitPriceCents,
        formattedUnitPrice: "",
        quantity: 1,
      });
    }
  }, [addLine, unitPriceCents]);
  return null;
}

function renderWithCart(unitPriceCents = 0) {
  return render(
    <CartProvider>
      <CartSeeder unitPriceCents={unitPriceCents} />
      <AnnouncementBarCartAware />
    </CartProvider>,
  );
}

// cfw-xyw: helper for the prop-override tests below.
function renderWithProps(props: Parameters<typeof AnnouncementBarCartAware>[0]) {
  return render(
    <CartProvider>
      <AnnouncementBarCartAware {...(props ?? {})} />
    </CartProvider>,
  );
}

// ── AnnouncementBarCartAware — static cart states ──────────────────

describe("AnnouncementBarCartAware", () => {
  it("renders the static prompt when the cart is empty", () => {
    renderWithCart(0);
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toMatch(/free white-glove delivery/i);
  });

  it("renders progress copy from a non-empty, sub-threshold cart", () => {
    renderWithCart(50_000); // $500 in the cart
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe(
      "You're $1,000.00 away from free white-glove delivery",
    );
  });

  it("renders qualified copy when the cart meets the threshold", () => {
    renderWithCart(FREE_DELIVERY_THRESHOLD_CENTS);
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toMatch(/you qualify/i);
  });

  // ── rotation behaviour ───────────────────────────────────────────

  it("starts on the first rotation message", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(0);
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toContain(ROTATION_MESSAGES[0]);
  });

  it("advances to the next message after one interval", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(0);
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS));
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toContain(ROTATION_MESSAGES[1]);
  });

  it("cycles through all 5 messages and wraps back to the first", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(0);
    const region = screen.getByRole("region", { name: /site announcement/i });

    for (let i = 0; i < ROTATION_MESSAGES.length; i++) {
      // Index 3 (swatch) includes a CTA link — textContent includes the link label.
      expect(region.textContent).toContain(ROTATION_MESSAGES[i]);
      act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS));
    }
    // After a full cycle it wraps back to index 0
    expect(region.textContent).toContain(ROTATION_MESSAGES[0]);
  });

  it("swatch message shows a link to /swatch-request", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(0);
    // Advance to the swatch message (index 3)
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS * 3));
    const link = screen.getByRole("link", { name: /order free swatches/i });
    expect(link).toHaveAttribute("href", "/swatch-request");
  });

  it("stops rotating and shows cart copy when items are added", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Start with non-empty cart — rotation should not run
    renderWithCart(50_000);
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS * 3));

    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe(
      "You're $1,000.00 away from free white-glove delivery",
    );
  });

  it("does not advance index when cart is non-empty", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(FREE_DELIVERY_THRESHOLD_CENTS + 1);

    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS * 10));

    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toMatch(/you qualify/i);
  });

  it("does not advance before one full interval elapses", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithCart(0);
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS - 1));
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe(ROTATION_MESSAGES[0]);
  });

  it("resets index to 0 when cart is cleared after mid-sequence items were present", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    type Phase = "empty" | "seeded" | "cleared";
    function PhasedCartController({ phase }: { phase: Phase }) {
      const { addLine, clear } = useCart();
      useEffect(() => {
        if (phase === "seeded") {
          addLine({
            id: "ctrl",
            productId: "ctrl-product",
            productName: "Ctrl Item",
            unitPriceCents: 50_000,
            formattedUnitPrice: "",
            quantity: 1,
          });
        } else if (phase === "cleared") {
          clear();
        }
      }, [phase, addLine, clear]);
      return null;
    }

    const { rerender } = render(
      <CartProvider>
        <PhasedCartController phase="empty" />
        <AnnouncementBarCartAware />
      </CartProvider>,
    );

    // Advance rotation to index 2
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS * 2));

    // Add items — setIndex(0) should fire, rotation stops
    rerender(
      <CartProvider>
        <PhasedCartController phase="seeded" />
        <AnnouncementBarCartAware />
      </CartProvider>,
    );
    act(() => {}); // flush effects

    // Clear the cart — rotation should restart from index 0
    rerender(
      <CartProvider>
        <PhasedCartController phase="cleared" />
        <AnnouncementBarCartAware />
      </CartProvider>,
    );
    act(() => {}); // flush effects

    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe(ROTATION_MESSAGES[0]);
  });
});

// ── cfw-xyw: prop-driven rotation copy ─────────────────────────────────
//
// Pass-1 of the cfw-66o announcement-bar refactor: AnnouncementBarCartAware
// accepts rotationMessages + rotationCtas as props with defaults that
// preserve today's hardcoded copy. The data-wiring side (server fetch +
// Header restructure) is a follow-up; here we pin the override contract.

describe("AnnouncementBarCartAware — prop overrides (cfw-xyw)", () => {
  it("renders Brenda's first override message instead of the default static prompt", () => {
    renderWithProps({
      rotationMessages: ["Limited-time offer: 15% off all frames"],
      rotationCtas: [undefined],
    });
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toContain(
      "Limited-time offer: 15% off all frames",
    );
    expect(region.textContent).not.toMatch(/free white-glove delivery/i);
  });

  it("renders an owner-supplied CTA pair when one is provided", () => {
    renderWithProps({
      rotationMessages: ["Memorial Day Sale"],
      rotationCtas: [{ ctaLabel: "Shop the sale", ctaHref: "/sale" }],
    });
    const cta = screen.getByRole("link", { name: /shop the sale/i });
    expect(cta).toHaveAttribute("href", "/sale");
  });

  it("rotates through a 2-message owner-supplied list (modulo wrap)", () => {
    vi.useFakeTimers();
    renderWithProps({
      rotationMessages: ["Custom A", "Custom B"],
      rotationCtas: [undefined, undefined],
    });
    const region = screen.getByRole("region", { name: /site announcement/i });
    expect(region.textContent).toBe("Custom A");
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS));
    expect(region.textContent).toBe("Custom B");
    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS));
    expect(region.textContent).toBe("Custom A");
  });

  it("falls back to the announcementMessage path when an empty messages array is supplied", () => {
    renderWithProps({
      rotationMessages: [],
      rotationCtas: [],
    });
    const region = screen.getByRole("region", { name: /site announcement/i });
    // Empty messages disables the rotating prompt; cart-aware copy is the
    // only thing left, and an empty cart returns the static-prompt fallback
    // from announcementMessage(0).
    expect(region.textContent).toMatch(/free white-glove delivery on/i);
  });
});

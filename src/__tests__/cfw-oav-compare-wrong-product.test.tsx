/**
 * cfw-oav: Compare button shows "In Compare" on wrong product.
 *
 * Root cause: AdGrid's single-category path returns products without _id
 * unfiltered, causing key={undefined} collisions in the React list. When the
 * category filter changes, React reassigns component instances by position —
 * the slugs state from one product's AddToCompareButton bleeds into another
 * product's slot.
 *
 * Fix: mirror the cfw-5uw patch already applied to FilterFirst — filter out
 * products with no _id in the single-category path so React always receives
 * stable, unique keys.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// -------------------------------------------------------------------
// localStorage + window.dispatchEvent stubs (no real browser storage)
// -------------------------------------------------------------------
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
});

// dispatchEvent must stay synchronous and invoke registered listeners.
const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
vi.stubGlobal("dispatchEvent", (evt: Event) => {
  (listeners[evt.type] ?? []).forEach((l) =>
    typeof l === "function" ? l(evt) : l.handleEvent(evt),
  );
  return true;
});
vi.stubGlobal("addEventListener", (type: string, listener: EventListenerOrEventListenerObject) => {
  listeners[type] ??= [];
  listeners[type].push(listener);
});
vi.stubGlobal("removeEventListener", (type: string, listener: EventListenerOrEventListenerObject) => {
  listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
});

import { AddToCompareButton } from "@/components/compare/AddToCompareButton";

// -------------------------------------------------------------------

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
  Object.keys(listeners).forEach((k) => delete listeners[k]);
});

describe("cfw-oav — AddToCompareButton marks the correct product", () => {
  it("clicking Compare on product A marks A, not B", () => {
    render(
      <div>
        <AddToCompareButton slug="product-a" data-product="a" />
        <AddToCompareButton slug="product-b" data-product="b" />
      </div>,
    );

    const buttons = screen.getAllByTestId("add-to-compare");
    expect(buttons).toHaveLength(2);

    // Click the first button (product A)
    fireEvent.click(buttons[0]);

    // Product A's button should show "In compare"
    expect(buttons[0]).toHaveTextContent(/in compare/i);
    // Product B's button must NOT show "In compare"
    expect(buttons[1]).not.toHaveTextContent(/in compare/i);
    expect(buttons[1]).toHaveTextContent(/^compare$/i);
  });

  it("clicking Compare on product B marks B, not A", () => {
    render(
      <div>
        <AddToCompareButton slug="product-a" />
        <AddToCompareButton slug="product-b" />
      </div>,
    );

    const buttons = screen.getAllByTestId("add-to-compare");
    fireEvent.click(buttons[1]);

    expect(buttons[1]).toHaveTextContent(/in compare/i);
    expect(buttons[0]).not.toHaveTextContent(/in compare/i);
  });

  it("clicking the same product twice removes it from compare", () => {
    render(<AddToCompareButton slug="product-a" />);
    const btn = screen.getByTestId("add-to-compare");

    fireEvent.click(btn); // add
    expect(btn).toHaveTextContent(/in compare/i);

    fireEvent.click(btn); // remove
    expect(btn).toHaveTextContent(/^compare$/i);
  });
});

// -------------------------------------------------------------------
// AdGrid key-collision regression: products without _id must be filtered
// in the single-category path so React never receives key={undefined}.
// If two items share key={undefined}, React assigns them by position and
// reassigning a component instance (on filter-change) bleeds slugs state
// from one product slot onto another.
// -------------------------------------------------------------------
describe("cfw-oav — AdGrid single-category path filters no-_id products", () => {
  it("omits products with no _id so key={undefined} collisions cannot occur", async () => {
    // We import AdGrid lazily after the localStorage stub is in place.
    const { AdGrid } = await import("@/components/theme-ad/AdGrid");

    const categories = [
      {
        slug: "futons",
        label: "Futons",
        products: [
          // _id missing — must be filtered OUT to avoid key={undefined}
          { slug: "orphan-product", name: "Orphan" },
          // _id present — must be kept
          { _id: "prod-1", slug: "kingston", name: "Kingston" },
          { _id: "prod-2", slug: "blue-ridge", name: "Blue Ridge" },
        ] as Parameters<typeof AdGrid>[0]["categories"][0]["products"],
      },
    ];

    const { container } = render(<AdGrid categories={categories} />);

    // Switch to the "futons" specific tab by clicking its chip
    const futonTab = screen.getByRole("button", { name: /futons/i });
    fireEvent.click(futonTab);

    // The product WITHOUT _id should not be rendered (key collision risk)
    expect(container).not.toHaveTextContent("Orphan");

    // Products WITH _id should still render
    expect(container).toHaveTextContent("Kingston");
    expect(container).toHaveTextContent("Blue Ridge");
  });
});

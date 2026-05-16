import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

// cf-pdv4: VariantPicker now uses next/navigation hooks for URL
// hydration + sync. Provide a minimal mock so the existing
// behavioral tests still pass — URL-specific behavior is covered by
// VariantPicker-url-hydration.test.tsx.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/products/test-frame",
}));

import { VariantPicker } from "@/components/product/VariantPicker";
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
  {
    name: "Fabric",
    choices: [
      { value: "Linen", description: "Linen" },
      { value: "Velvet", description: "Velvet" },
    ],
  },
];

const variants: VariantInput[] = [
  {
    _id: "v-full-linen",
    choices: { Size: "Full", Fabric: "Linen" },
    variant: { priceData: { formatted: { price: "$799" } } },
    stock: { inStock: true },
  },
  {
    _id: "v-full-velvet",
    choices: { Size: "Full", Fabric: "Velvet" },
    variant: { priceData: { formatted: { price: "$899" } } },
    stock: { inStock: false },
  },
  {
    _id: "v-queen-linen",
    choices: { Size: "Queen", Fabric: "Linen" },
    variant: { priceData: { formatted: { price: "$999" } } },
    stock: { inStock: true, trackQuantity: true, quantity: 3 },
  },
  {
    _id: "v-queen-velvet",
    choices: { Size: "Queen", Fabric: "Velvet" },
    variant: { priceData: { formatted: { price: "$1,099" } } },
    stock: { inStock: true, trackQuantity: true, quantity: 0 },
  },
];

describe("VariantPicker (cf-3qt.2.1)", () => {
  it("renders one radiogroup per product option with accessible name", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /size/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /fabric/i })).toBeInTheDocument();
  });

  it("seeds selection from the first in-stock variant and shows its price", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const sizeGroup = screen.getByRole("radiogroup", { name: /size/i });
    expect(within(sizeGroup).getByRole("radio", { name: /size: full/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("variant-price")).toHaveTextContent("$799");
  });

  it("updates price and aria-checked when a different choice is selected", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /size: queen/i }));
    expect(screen.getByRole("radio", { name: /size: queen/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("variant-price")).toHaveTextContent("$999");
  });

  it("marks out-of-stock choices disabled (cannot be selected)", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const velvet = screen.getByRole("radio", { name: /fabric: velvet.*out of stock/i });
    expect(velvet).toBeDisabled();
  });

  it("shows 'Out of stock' badge when the selected variant has no stock", async () => {
    // Force selection to queen+velvet (OOS). Construct a picker where initialSelection picks that.
    const oosOnly: VariantInput[] = [
      {
        _id: "only-oos",
        choices: { Size: "Full", Fabric: "Linen" },
        variant: { priceData: { formatted: { price: "$100" } } },
        stock: { inStock: false },
      },
    ];
    render(
      <VariantPicker
        productOptions={[
          {
            name: "Size",
            choices: [{ value: "Full", description: "Full" }],
          },
          {
            name: "Fabric",
            choices: [{ value: "Linen", description: "Linen" }],
          },
        ]}
        variants={oosOnly}
        fallbackPrice="$0"
      />,
    );
    expect(screen.getByTestId("oos-badge")).toHaveTextContent(/out of stock/i);
  });

  it("invokes onSelectionChange with the new selection and matched variant", () => {
    const onChange = vi.fn();
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
        onSelectionChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /size: queen/i }));
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual({ Size: "Queen", Fabric: "Linen" });
    expect(lastCall?.[1]).toEqual(
      expect.objectContaining({ _id: "v-queen-linen" }),
    );
  });

  it("moves focus and selection with arrow keys inside a group", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const sizeFull = screen.getByRole("radio", { name: /size: full/i });
    sizeFull.focus();
    fireEvent.keyDown(sizeFull, { key: "ArrowRight" });
    const sizeQueen = screen.getByRole("radio", { name: /size: queen/i });
    expect(sizeQueen).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(sizeQueen);
  });

  it("renders only the price when the product has no options", () => {
    render(
      <VariantPicker
        productOptions={[]}
        variants={[]}
        fallbackPrice="$499"
      />,
    );
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
    expect(screen.getByTestId("variant-price")).toHaveTextContent("$499");
  });

  it("gives each option group a distinct selected label in the legend", () => {
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    expect(screen.getByText(/size/i).closest("legend")).toHaveTextContent(/full/i);
    fireEvent.click(screen.getByRole("radio", { name: /size: queen/i }));
    expect(screen.getByText(/size/i).closest("legend")).toHaveTextContent(/queen/i);
  });

  it("cf-0jm fix1: OOS badge has no implicit aria-live (role=status removed to prevent double announcement)", () => {
    const oosOnly: VariantInput[] = [
      {
        _id: "oos",
        choices: { Size: "Full" },
        variant: { priceData: { formatted: { price: "$100" } } },
        stock: { inStock: false },
      },
    ];
    render(
      <VariantPicker
        productOptions={[{ name: "Size", choices: [{ value: "Full", description: "Full" }] }]}
        variants={oosOnly}
        fallbackPrice="$0"
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("oos-badge")).toHaveTextContent(/out of stock/i);
  });

  it("cf-0jm fix2: ArrowRight from a disabled choice (currentPos===-1) selects nearest enabled choice after it", () => {
    // Full (index 0) is disabled/unavailable; Queen (index 1) is enabled.
    // enabledIndexes=[1], so currentPos=-1 for index=0.
    // Old code: ArrowRight always jumped to enabledIndexes[0]=Queen (happens to be correct here).
    // New code: finds first enabled index > 0, which is index 1 → Queen.
    // We fire keyDown on the disabled Full button to exercise the -1 branch directly.
    const partialVariants: VariantInput[] = [
      {
        _id: "v1",
        choices: { Size: "Queen" },
        variant: { priceData: { formatted: { price: "$900" } } },
        stock: { inStock: true },
      },
    ];
    render(
      <VariantPicker
        productOptions={[
          {
            name: "Size",
            choices: [
              { value: "Full", description: "Full" },
              { value: "Queen", description: "Queen" },
            ],
          },
        ]}
        variants={partialVariants}
        fallbackPrice="$0"
      />,
    );
    const full = screen.getByRole("radio", { name: /size: full/i });
    expect(full).toBeDisabled();
    // fireEvent bypasses browser disabled-element focus restriction — exercises the handler.
    fireEvent.keyDown(full, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /size: queen/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("cf-0jm fix2: ArrowRight wraps to first enabled when all enabled choices are before the focused index", () => {
    // Queen (index 1) is disabled; Full (index 0) is enabled.
    // enabledIndexes=[0]. From index=1 (Full), no enabled after it → wraps to index 0 (Full).
    const partialVariants: VariantInput[] = [
      {
        _id: "v1",
        choices: { Size: "Full" },
        variant: { priceData: { formatted: { price: "$800" } } },
        stock: { inStock: true },
      },
    ];
    render(
      <VariantPicker
        productOptions={[
          {
            name: "Size",
            choices: [
              { value: "Full", description: "Full" },
              { value: "Queen", description: "Queen" },
            ],
          },
        ]}
        variants={partialVariants}
        fallbackPrice="$0"
      />,
    );
    const queen = screen.getByRole("radio", { name: /size: queen/i });
    expect(queen).toBeDisabled();
    fireEvent.keyDown(queen, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /size: full/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("cf-0jm fix3: VariantPicker seeds from initialSelection — first in-stock variant wins", () => {
    // Documents the dual-state invariant: VariantPicker's useState seed must agree with
    // PdpInteractive's independent useState seed (same function, same args → same result).
    // If they diverge, onSelectionChange won't fire on load and parent state drifts.
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    expect(screen.getByTestId("variant-price")).toHaveTextContent("$799");
  });
});

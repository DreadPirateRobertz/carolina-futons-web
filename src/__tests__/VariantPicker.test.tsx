import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

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
    expect(screen.getByRole("status")).toHaveTextContent(/out of stock/i);
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
});

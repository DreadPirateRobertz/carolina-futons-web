import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

// cf-pdv4 (cf-lc1c G-3): VariantPicker should hydrate its initial
// selection from URL search params (?size=Queen&fabric=Velvet) and
// keep the URL in sync on user selection changes via router.replace
// (scroll:false). This enables sharable marketing-email deep-links to
// specific variants.

// Mock next/navigation BEFORE importing the component.
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
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
    stock: { inStock: true },
  },
  {
    _id: "v-queen-linen",
    choices: { Size: "Queen", Fabric: "Linen" },
    variant: { priceData: { formatted: { price: "$999" } } },
    stock: { inStock: true },
  },
  {
    _id: "v-queen-velvet",
    choices: { Size: "Queen", Fabric: "Velvet" },
    variant: { priceData: { formatted: { price: "$1,099" } } },
    stock: { inStock: true },
  },
];

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});

afterEach(() => {
  cleanup();
});

describe("VariantPicker URL hydration on mount (cf-pdv4)", () => {
  it("pre-selects Queen + Velvet when ?size=Queen&fabric=Velvet is in the URL", () => {
    mockSearchParams = new URLSearchParams("size=Queen&fabric=Velvet");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const sizeGroup = screen.getByRole("radiogroup", { name: /size/i });
    const fabricGroup = screen.getByRole("radiogroup", { name: /fabric/i });
    expect(
      within(sizeGroup).getByRole("radio", { name: /size: queen/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(fabricGroup).getByRole("radio", { name: /fabric: velvet/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("variant-price")).toHaveTextContent("$1,099");
  });

  it("falls back to first-in-stock default when URL has no matching params", () => {
    mockSearchParams = new URLSearchParams();
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const sizeGroup = screen.getByRole("radiogroup", { name: /size/i });
    expect(
      within(sizeGroup).getByRole("radio", { name: /size: full/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("ignores URL params whose values aren't valid choices for the option", () => {
    mockSearchParams = new URLSearchParams("size=King&fabric=Velvet");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const sizeGroup = screen.getByRole("radiogroup", { name: /size/i });
    const fabricGroup = screen.getByRole("radiogroup", { name: /fabric/i });
    // "King" isn't a valid Size choice → falls back to default (Full).
    expect(
      within(sizeGroup).getByRole("radio", { name: /size: full/i }),
    ).toHaveAttribute("aria-checked", "true");
    // "Velvet" IS valid → applied.
    expect(
      within(fabricGroup).getByRole("radio", { name: /fabric: velvet/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("applies a partial URL state (only one option present)", () => {
    mockSearchParams = new URLSearchParams("fabric=Velvet");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    // Size unspecified → default; Fabric applied.
    expect(
      within(
        screen.getByRole("radiogroup", { name: /size/i }),
      ).getByRole("radio", { name: /size: full/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(
        screen.getByRole("radiogroup", { name: /fabric/i }),
      ).getByRole("radio", { name: /fabric: velvet/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("is case-insensitive on URL param keys (Size vs size)", () => {
    mockSearchParams = new URLSearchParams("Size=Queen");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    expect(
      within(
        screen.getByRole("radiogroup", { name: /size/i }),
      ).getByRole("radio", { name: /size: queen/i }),
    ).toHaveAttribute("aria-checked", "true");
  });
});

describe("VariantPicker URL sync on selection change (cf-pdv4)", () => {
  it("calls router.replace with the updated query when a choice changes", () => {
    mockSearchParams = new URLSearchParams();
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const queenRadio = within(
      screen.getByRole("radiogroup", { name: /size/i }),
    ).getByRole("radio", { name: /size: queen/i });
    fireEvent.click(queenRadio);
    expect(mockReplace).toHaveBeenCalled();
    const lastCall = mockReplace.mock.calls.at(-1)!;
    const [url, opts] = lastCall;
    expect(url).toContain("size=Queen");
    // scroll:false preserves the user's scroll position on the PDP.
    expect(opts).toMatchObject({ scroll: false });
  });

  it("preserves the existing URL search params when adding a new one", () => {
    mockSearchParams = new URLSearchParams("utm_source=email");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const velvetRadio = within(
      screen.getByRole("radiogroup", { name: /fabric/i }),
    ).getByRole("radio", { name: /fabric: velvet/i });
    fireEvent.click(velvetRadio);
    const url = mockReplace.mock.calls.at(-1)![0] as string;
    expect(url).toContain("utm_source=email");
    expect(url).toContain("fabric=Velvet");
  });

  it("updates an existing variant param in place (not appending duplicates)", () => {
    mockSearchParams = new URLSearchParams("size=Full");
    render(
      <VariantPicker
        productOptions={productOptions}
        variants={variants}
        fallbackPrice="$0"
      />,
    );
    const queenRadio = within(
      screen.getByRole("radiogroup", { name: /size/i }),
    ).getByRole("radio", { name: /size: queen/i });
    fireEvent.click(queenRadio);
    const url = mockReplace.mock.calls.at(-1)![0] as string;
    // No duplicate ?size=Full&size=Queen
    expect(url).toContain("size=Queen");
    expect(url).not.toMatch(/size=Full/);
  });
});

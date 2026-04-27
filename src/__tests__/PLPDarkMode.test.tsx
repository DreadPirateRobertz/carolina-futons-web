import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { PLPControls } from "@/components/plp/PLPControls";
import { PLPPagination } from "@/components/plp/PLPPagination";

// cf-b3ai: dark mode Tailwind variants on PLP controls + pagination

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/shop/futon-frames",
  useSearchParams: () => new URLSearchParams(),
}));

const DEFAULT_CONTROLS_PROPS = {
  sort: "featured" as const,
  inStockOnly: false,
  totalFiltered: 42,
};

const DEFAULT_PAGINATION_PROPS = {
  page: 2,
  hasNext: true,
  hasPrev: true,
  basePath: "/shop/futon-frames",
  searchParams: {},
};

describe("PLPControls — dark mode (cf-b3ai)", () => {
  it("carries dark:bg-zinc-800 and dark:border-zinc-700 on the container", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("dark:bg-zinc-800");
    expect(wrapper?.className).toContain("dark:border-zinc-700");
  });

  it("carries dark:bg-zinc-700 dark:text-zinc-100 on the sort select", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const select = container.querySelector("select");
    expect(select?.className).toContain("dark:bg-zinc-700");
    expect(select?.className).toContain("dark:text-zinc-100");
  });

  it("carries dark:bg-zinc-100 dark:text-zinc-900 on the Apply button (inverted for dark bg)", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const btn = container.querySelector("button[type='submit']");
    expect(btn?.className).toContain("dark:bg-zinc-100");
    expect(btn?.className).toContain("dark:text-zinc-900");
  });

  it("carries dark:text-zinc-400 on both Min price and Max price labels", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const labels = Array.from(container.querySelectorAll("label"));
    const minLabel = labels.find((l) => l.textContent?.includes("Min price"));
    const maxLabel = labels.find((l) => l.textContent?.includes("Max price"));
    expect(minLabel?.className).toContain("dark:text-zinc-400");
    expect(maxLabel?.className).toContain("dark:text-zinc-400");
  });

  it("carries dark:bg-zinc-700 dark:text-zinc-100 on price number inputs", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const minInput = container.querySelector("#plp-priceMin");
    const maxInput = container.querySelector("#plp-priceMax");
    expect(minInput?.className).toContain("dark:bg-zinc-700");
    expect(minInput?.className).toContain("dark:text-zinc-100");
    expect(maxInput?.className).toContain("dark:bg-zinc-700");
    expect(maxInput?.className).toContain("dark:text-zinc-100");
  });

  it("carries dark:accent-zinc-300 on the in-stock checkbox", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const checkbox = container.querySelector("#plp-inStock");
    expect(checkbox?.className).toContain("dark:accent-zinc-300");
  });

  it("carries dark:text-zinc-400 on the product count", () => {
    const { container } = render(<PLPControls {...DEFAULT_CONTROLS_PROPS} />);
    const count = container.querySelector("p.ml-auto");
    expect(count?.className).toContain("dark:text-zinc-400");
  });
});

describe("PLPPagination — dark mode (cf-b3ai)", () => {
  it("carries dark:text-zinc-200 dark:border-zinc-600 on active page links", () => {
    const { container } = render(
      <PLPPagination {...DEFAULT_PAGINATION_PROPS} />,
    );
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.className).toContain("dark:text-zinc-200");
      expect(link.className).toContain("dark:border-zinc-600");
    }
  });

  it("carries dark:text-zinc-600 dark:border-zinc-700 on disabled spans (hasPrev=false, one side active)", () => {
    const { container } = render(
      <PLPPagination
        page={1}
        hasNext={true}
        hasPrev={false}
        basePath="/shop/futon-frames"
        searchParams={{}}
      />,
    );
    const spans = Array.from(container.querySelectorAll("span")).filter(
      (s) => !s.textContent?.startsWith("Page"),
    );
    expect(spans.length).toBeGreaterThan(0);
    const disabledSpan = spans[0];
    expect(disabledSpan.className).toContain("dark:text-zinc-600");
    expect(disabledSpan.className).toContain("dark:border-zinc-700");
  });

  it("renders nothing when both hasPrev and hasNext are false", () => {
    const { container } = render(
      <PLPPagination
        page={1}
        hasNext={false}
        hasPrev={false}
        basePath="/shop/futon-frames"
        searchParams={{}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("carries dark:text-zinc-400 on the page indicator", () => {
    const { container } = render(
      <PLPPagination {...DEFAULT_PAGINATION_PROPS} />,
    );
    const pageSpan = Array.from(container.querySelectorAll("span")).find((s) =>
      s.textContent?.startsWith("Page"),
    );
    expect(pageSpan?.className).toContain("dark:text-zinc-400");
  });
});

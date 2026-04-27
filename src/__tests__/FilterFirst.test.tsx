import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("framer-motion", () => ({
  m: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  useInView: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/product/review-stats", () => ({ getReviewStats: () => null }));
vi.mock("@/lib/product/plp-card-images", () => ({
  getPlpCardImages: () => ({ primary: null, secondary: null }),
}));
vi.mock("@/lib/product/plp-price", () => ({
  formatPlpPrice: (p: { priceData?: { formatted?: { price?: string } } }) =>
    p.priceData?.formatted?.price ?? "$0",
}));

import { FilterFirst, type ThemeDCategory } from "@/components/theme-d/FilterFirst";

function makeProduct(id: string, price: number) {
  return {
    _id: id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    priceRange: { minValue: price, maxValue: price },
    priceData: { price, formatted: { price: `$${price}` } },
    media: null,
    stock: { inStock: true },
    collectionIds: [],
  } as unknown as Parameters<typeof FilterFirst>[0]["categories"][0]["products"][0];
}

const frames: ThemeDCategory = {
  slug: "futon-frames",
  label: "Futon Frames",
  products: [makeProduct("f1", 799), makeProduct("f2", 1299)],
};
const mattresses: ThemeDCategory = {
  slug: "mattresses",
  label: "Mattresses",
  products: [makeProduct("m1", 349), makeProduct("m2", 599)],
};

describe("FilterFirst (Theme D)", () => {
  it("shows all products when 'All' and 'Any price' are selected (default)", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    expect(screen.getByText(/4 products/i)).toBeInTheDocument();
  });

  it("filters to selected category", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    expect(screen.getByText(/2 products/i)).toBeInTheDocument();
  });

  it("filters by price range", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    fireEvent.click(screen.getByRole("button", { name: /under \$500/i }));
    // Only m1 ($349) is under $500
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });

  it("combines category + price filters", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$500 – \$1,000/i }));
    // f1 ($799) is in Futon Frames and in [$500-$1000]
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });

  it("shows empty state when nothing matches", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    fireEvent.click(screen.getByRole("button", { name: /mattresses/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$2,000\+/i }));
    expect(screen.queryByText(/\d+ product/i)).toBeNull();
    expect(screen.getByText(/no products match/i)).toBeInTheDocument();
  });

  it("category chips have aria-pressed reflecting selection", () => {
    render(<FilterFirst categories={[frames, mattresses]} />);
    const allBtn = screen.getByRole("button", { name: /^all$/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    expect(allBtn).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /futon frames/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("deduplicates products that appear in multiple categories", () => {
    const shared = makeProduct("shared", 999);
    const catA: ThemeDCategory = { slug: "a", label: "A", products: [shared] };
    const catB: ThemeDCategory = { slug: "b", label: "B", products: [shared] };
    render(<FilterFirst categories={[catA, catB]} />);
    // "All" view should show the shared product only once
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
     
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
vi.mock("@/lib/product/plp-card-images", () => ({
  getPlpCardImages: () => ({ primary: null, secondary: null }),
}));
vi.mock("@/lib/product/plp-price", () => ({
  formatPlpPrice: (p: { priceData?: { formatted?: { price?: string } } }) =>
    p.priceData?.formatted?.price ?? "$0",
}));

import { FilterFirst, type ThemeDCategory } from "@/components/theme-d/FilterFirst";
import { FILTER_FIRST_HERO_DEFAULTS } from "@/lib/cms/filter-first-content";

const HERO = FILTER_FIRST_HERO_DEFAULTS;

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
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    expect(screen.getByText(/4 products/i)).toBeInTheDocument();
  });

  it("filters to selected category", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    expect(screen.getByText(/2 products/i)).toBeInTheDocument();
  });

  it("filters by price range", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    fireEvent.click(screen.getByRole("button", { name: /under \$500/i }));
    // Only m1 ($349) is under $500
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });

  it("combines category + price filters", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$500 – \$1,000/i }));
    // f1 ($799) is in Futon Frames and in [$500-$1000]
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });

  it("shows empty state when nothing matches", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    fireEvent.click(screen.getByRole("button", { name: /mattresses/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$2,000\+/i }));
    expect(screen.queryByText(/\d+ product/i)).toBeNull();
    expect(screen.getByText(/no products match/i)).toBeInTheDocument();
  });

  // cfw-15s: hero copy comes from the loadFilterFirstHeroCopy prop, not
  // hardcoded in the component. Asserts the prop renders at all three sites
  // (eyebrow / headline / subhead). Locks the SiteContent wiring in so a
  // future refactor that hardcodes copy back into FilterFirst fails CI.
  it("renders hero copy from the heroCopy prop (eyebrow + headline + subhead)", () => {
    const custom: typeof HERO = {
      eyebrow: "Custom eyebrow text",
      headline: "Custom headline",
      subhead: "Custom subhead body",
    };
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={custom} />);
    expect(screen.getByText("Custom eyebrow text")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Custom headline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Custom subhead body")).toBeInTheDocument();
  });

  it("category chips have aria-pressed reflecting selection", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
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
    render(<FilterFirst categories={[catA, catB]} heroCopy={HERO} />);
    // "All" view should show the shared product only once
    expect(screen.getByText(/1 product$/i)).toBeInTheDocument();
  });

  // cf-urbq: empty-state hint must use text-muted-foreground for WCAG contrast
  it("empty-state hint uses text-muted-foreground", () => {
    render(<FilterFirst categories={[frames, mattresses]} heroCopy={HERO} />);
    fireEvent.click(screen.getByRole("button", { name: /mattresses/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$2,000\+/i }));
    expect(screen.getByText(/try a different category/i)).toHaveClass("text-muted-foreground");
  });
});

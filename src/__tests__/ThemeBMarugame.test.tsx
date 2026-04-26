import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// Stub framer-motion — jsdom has no scroll/IntersectionObserver environment.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useInView: vi.fn(() => true),           // all items immediately "in view"
    useReducedMotion: vi.fn(() => false),
    m: {
      ...actual.m,
      li: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
        <li {...(rest as object)}>{children}</li>
      ),
    },
  };
});

// Server action mock — MarugameGrid calls this for "Load more".
vi.mock("@/components/theme-b/actions", () => ({
  fetchMoreMarugameProducts: vi.fn().mockResolvedValue([]),
}));

import { MarugameHero } from "@/components/theme-b/MarugameHero";
import { MarugameGrid } from "@/components/theme-b/MarugameGrid";
import type { WixProduct } from "@/lib/wix/products";

// Minimal stub matching the WixProduct shape used by the grid.
function makeProduct(i: number): WixProduct {
  return {
    _id: `prod-${i}`,
    name: `Test Product ${i}`,
    slug: `test-product-${i}`,
    priceData: { price: 199 + i * 10, currency: "USD" },
    media: {
      mainMedia: {
        image: {
          url: `https://example.com/img${i}.jpg`,
          width: 800,
          height: 600,
        },
      },
    },
  } as unknown as WixProduct;
}

// ── MarugameHero ──────────────────────────────────────────────────────────────

describe("MarugameHero", () => {
  it("renders the Hero section landmark", () => {
    render(<MarugameHero />);
    expect(screen.getByRole("region", { name: "Hero" })).toBeInTheDocument();
  });

  it("shows the brand name and founding year", () => {
    render(<MarugameHero />);
    expect(screen.getByText(/Carolina Futons/i)).toBeInTheDocument();
    expect(screen.getByText(/Est. 1991/i)).toBeInTheDocument();
  });

  it("shows a tagline referencing craftsmanship", () => {
    render(<MarugameHero />);
    expect(screen.getByText(/hardwood frames/i)).toBeInTheDocument();
  });

  it("shows a scroll cue", () => {
    render(<MarugameHero />);
    expect(screen.getByText(/scroll/i)).toBeInTheDocument();
  });
});

// ── MarugameGrid ──────────────────────────────────────────────────────────────

describe("MarugameGrid", () => {
  const products = Array.from({ length: 8 }, (_, i) => makeProduct(i));

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("renders the Products section landmark", () => {
    render(<MarugameGrid initial={products} />);
    expect(screen.getByRole("region", { name: "Products" })).toBeInTheDocument();
  });

  it("renders one li per product", () => {
    render(<MarugameGrid initial={products} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(products.length);
  });

  it("each item has a link to /products/<slug>", () => {
    render(<MarugameGrid initial={products} />);
    products.forEach((p) => {
      const link = screen.getByRole("link", { name: new RegExp(`Test Product ${p._id?.slice(-1)}`, "i") });
      expect(link.getAttribute("href")).toBe(`/products/${p.slug}`);
    });
  });

  it("renders each product name as a heading", () => {
    render(<MarugameGrid initial={products} />);
    products.forEach((p) => {
      expect(screen.getByRole("heading", { name: p.name! })).toBeInTheDocument();
    });
  });

  it("first item has col-span-2 class (editorial lead)", () => {
    const { container } = render(<MarugameGrid initial={products} />);
    const firstItem = container.querySelector("li");
    expect(firstItem?.classList.contains("col-span-2")).toBe(true);
  });

  it("subsequent items have col-span-1 class", () => {
    const { container } = render(<MarugameGrid initial={products} />);
    const items = container.querySelectorAll("li");
    const nonLead = Array.from(items).slice(1);
    nonLead.forEach((item) => {
      expect(item.classList.contains("col-span-1")).toBe(true);
    });
  });

  it("shows Load more button when products count equals pageSize", () => {
    render(<MarugameGrid initial={products} pageSize={8} />);
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("hides Load more when initial count is less than pageSize (exhausted)", () => {
    render(<MarugameGrid initial={products.slice(0, 3)} pageSize={8} />);
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });
});

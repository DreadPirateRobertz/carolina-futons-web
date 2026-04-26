import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// framer-motion stubs — jsdom lacks IntersectionObserver / matchMedia / RAF.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useInView: vi.fn(() => true),
    useReducedMotion: vi.fn(() => true), // suppress animations in MrPopsHero
    m: {
      ...actual.m,
      span: ({ children }: { children: ReactNode }) => <span>{children}</span>,
      p: ({ children, className }: { children: ReactNode; className?: string }) => (
        <p className={className}>{children}</p>
      ),
      div: ({ children, className }: { children: ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
      ),
      li: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
        <li {...(rest as object)}>{children}</li>
      ),
    },
  };
});

// Product data helpers — unique IDs per collection so "all" tab dedup is 16 items.
const makeProducts = (collectionId: string, count = 4) =>
  Array.from({ length: count }, (_, i) => ({
    _id: `${collectionId}-${i}`,
    name: `${collectionId} Product ${i}`,
    slug: `${collectionId}-product-${i}`,
    priceData: { price: 300 + i * 200, currency: "USD" },
    media: {
      mainMedia: {
        image: {
          url: `https://example.com/${collectionId}/${i}.jpg`,
          width: 800,
          height: 600,
        },
      },
    },
  }));

vi.mock("@/lib/wix/products", () => ({
  getCollectionBySlug: vi.fn().mockImplementation((slug: string) =>
    Promise.resolve({ _id: `col-${slug}` }),
  ),
  listProductsByCollectionId: vi.fn().mockImplementation((colId: string) =>
    Promise.resolve(makeProducts(colId)),
  ),
}));

import HomePage from "@/app/page";

async function renderHome() {
  const element = await HomePage();
  return render(element);
}

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

// cf-theme-ad-grid: A+D hybrid — MrPopsHero + MrPopsMarquee + AdGrid filter-first.
describe("HomePage — A+D hybrid (cf-theme-ad-grid)", () => {
  it("renders the Hero landmark", async () => {
    await renderHome();
    expect(screen.getByRole("region", { name: /hero/i })).toBeInTheDocument();
  });

  it("renders the MrPops marquee gallery between hero and grid", async () => {
    await renderHome();
    expect(
      screen.getByRole("region", { name: /furniture gallery/i }),
    ).toBeInTheDocument();
  });

  it("renders the Shop collection heading", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { name: /shop our collection/i }),
    ).toBeInTheDocument();
  });

  it("renders the category filter group", async () => {
    await renderHome();
    expect(
      screen.getByRole("group", { name: /filter by category/i }),
    ).toBeInTheDocument();
  });

  it("renders All + 4 category chips", async () => {
    await renderHome();
    const group = screen.getByRole("group", { name: /filter by category/i });
    const buttons = group.querySelectorAll("button");
    // All + Futon Frames + Murphy Beds + Platform Beds + Mattresses
    expect(buttons).toHaveLength(5);
  });

  it("renders the price filter group", async () => {
    await renderHome();
    expect(
      screen.getByRole("group", { name: /filter by price/i }),
    ).toBeInTheDocument();
  });

  it("renders the Products grid landmark", async () => {
    await renderHome();
    expect(
      screen.getByRole("region", { name: /products/i }),
    ).toBeInTheDocument();
  });

  it("shows all 16 products on the All tab (4 categories × 4 products)", async () => {
    await renderHome();
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });

  it("announces product count to screen readers", async () => {
    await renderHome();
    const count = screen.getByRole("status");
    expect(count).toHaveTextContent(/16 products/i);
  });

  it("All chip is pressed by default", async () => {
    await renderHome();
    const allBtn = screen.getByRole("button", { name: /^all$/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("selecting a category chip filters the product list", async () => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: /futon frames/i }));
    // col-col-futon-frames: 4 products
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("selecting a price chip filters by price range", async () => {
    await renderHome();
    // "Under $500" — products with price < 500: prices are 300 (i=0) only per category
    fireEvent.click(screen.getByRole("button", { name: /under \$500/i }));
    // 4 collections × 1 product under $500 each = 4
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("shows zero-state message when no products match filters", async () => {
    await renderHome();
    // Prices are 300, 500, 700, 900 — "$2,000+" matches none
    fireEvent.click(screen.getByRole("button", { name: /\$2,000\+/i }));
    expect(
      screen.getByText(/no products match those filters/i),
    ).toBeInTheDocument();
  });

  it("fetches products for each of the 4 categories on render", async () => {
    const mod = await import("@/lib/wix/products");
    (mod.getCollectionBySlug as ReturnType<typeof vi.fn>).mockClear();
    await renderHome();
    expect(mod.getCollectionBySlug).toHaveBeenCalledTimes(4);
  });

  it("does not render Marugame landmarks (regression guard)", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-slot='marugame-hero']")).toBeNull();
    expect(container.querySelector("[data-slot='trust-bar']")).toBeNull();
  });

  it("exposes the ad-grid data slot", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-slot='ad-grid']")).not.toBeNull();
  });
});

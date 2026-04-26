import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// framer-motion stubs — jsdom has no IntersectionObserver / matchMedia env.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useInView: vi.fn(() => true),
    useReducedMotion: vi.fn(() => false),
    m: {
      ...actual.m,
      li: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
        <li {...(rest as object)}>{children}</li>
      ),
    },
  };
});

// Server action mock for MarugameGrid "Load more".
vi.mock("@/components/theme-b/actions", () => ({
  fetchMoreMarugameProducts: vi.fn().mockResolvedValue([]),
}));

// listProducts stub — 8 minimal products so the grid renders fully.
vi.mock("@/lib/wix/products", () => ({
  listProducts: vi.fn().mockResolvedValue(
    Array.from({ length: 8 }, (_, i) => ({
      _id: `prod-${i}`,
      name: `Product ${i}`,
      slug: `product-${i}`,
      priceData: { price: 200 + i * 10, currency: "USD" },
      media: {
        mainMedia: {
          image: { url: `https://example.com/${i}.jpg`, width: 800, height: 600 },
        },
      },
    })),
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

// cf-fikb: Theme B Marugame promoted to default home.
describe("HomePage — Marugame (cf-fikb)", () => {
  it("renders the Hero landmark", async () => {
    await renderHome();
    expect(screen.getByRole("region", { name: /hero/i })).toBeInTheDocument();
  });

  it("renders the Mr Pops marquee gallery between hero and grid", async () => {
    await renderHome();
    expect(
      screen.getByRole("region", { name: /furniture gallery/i }),
    ).toBeInTheDocument();
  });

  it("renders the Products grid landmark", async () => {
    await renderHome();
    expect(screen.getByRole("region", { name: /products/i })).toBeInTheDocument();
  });

  it("calls listProducts once at render time", async () => {
    const mod = await import("@/lib/wix/products");
    (mod.listProducts as ReturnType<typeof vi.fn>).mockClear();
    await renderHome();
    expect(mod.listProducts).toHaveBeenCalledTimes(1);
  });

  it("renders one product card per product returned by listProducts", async () => {
    await renderHome();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("shows Load more button when initial count equals pageSize", async () => {
    await renderHome();
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("does not render old home page landmarks (regression guard)", async () => {
    const { container } = await renderHome();
    expect(container.querySelector("[data-testid='shop-categories']")).toBeNull();
    expect(container.querySelector("[data-slot='trust-bar']")).toBeNull();
  });
});

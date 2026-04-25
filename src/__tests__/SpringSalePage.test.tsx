import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.5.2: Spring Sale landing — server component smoke test.
//
// derived-products + categories + Newsletter action are mocked so the
// page can render in jsdom without a Wix client, an SMTP transport, or
// a hydrated newsletter store.

const resolveDerivedProducts = vi.fn();
vi.mock("@/lib/shop/derived-products", () => ({
  resolveDerivedProducts: (...args: unknown[]) =>
    resolveDerivedProducts(...args),
}));

vi.mock("@/lib/shop/categories", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/shop/categories")>(
      "@/lib/shop/categories",
    );
  return {
    ...actual,
    findCategory: (slug: string) => actual.findCategory(slug),
  };
});

// FeaturedProducts is purely presentational — render its children inline so
// we can assert on the strip without booting the ProductCard image
// pipeline (which needs Wix CDN config).
vi.mock("@/components/site/FeaturedProducts", () => ({
  FeaturedProducts: ({ products }: { products: ReadonlyArray<{ _id?: string }> }) => (
    <ul data-testid="featured-products">
      {products.map((p) => (
        <li key={p._id ?? "x"}>{p._id ?? "product"}</li>
      ))}
    </ul>
  ),
}));

// NewsletterSignup is a client component with useFormStatus / useActionState
// — replace with a marker so the server-component smoke test stays narrow.
vi.mock("@/components/site/NewsletterSignup", () => ({
  NewsletterSignup: () => (
    <div data-testid="newsletter-signup">newsletter</div>
  ),
}));

// LivingSky just renders an Image; replace with a div so we don't need to
// boot next/image in the test.
vi.mock("@/components/illustrations/LivingSky", () => ({
  LivingSky: () => <div data-testid="living-sky" />,
}));

import SpringSalePage from "@/app/spring-sale/page";

beforeEach(() => {
  resolveDerivedProducts.mockReset();
});

async function renderPage() {
  const ui = await SpringSalePage();
  render(ui);
}

describe("SpringSalePage", () => {
  it("renders the hero h1 + CTA wired to /shop/mattresses-sale", async () => {
    resolveDerivedProducts.mockResolvedValueOnce({ items: [] });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /spring sale/i }),
    ).toBeInTheDocument();
    const primaryCta = screen.getByRole("link", { name: /shop the sale/i });
    expect(primaryCta).toHaveAttribute("href", "/shop/mattresses-sale");
  });

  it("renders the FeaturedProducts strip when the resolver returns items", async () => {
    resolveDerivedProducts.mockResolvedValueOnce({
      items: [{ _id: "p1" }, { _id: "p2" }],
    });
    await renderPage();
    const strip = screen.getByTestId("featured-products");
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toContain("p1");
    expect(strip.textContent).toContain("p2");
  });

  it("hides the strip on a clean empty state (no items, no error)", async () => {
    resolveDerivedProducts.mockResolvedValueOnce({ items: [] });
    await renderPage();
    expect(screen.queryByTestId("featured-products")).toBeNull();
  });

  it("hides the strip on a Wix outage so users don't see misleading 'no items' copy", async () => {
    resolveDerivedProducts.mockResolvedValueOnce({
      items: [],
      error: "wix_sdk",
    });
    await renderPage();
    expect(screen.queryByTestId("featured-products")).toBeNull();
  });

  it("mounts the email-capture form so visitors can opt in to future drops", async () => {
    resolveDerivedProducts.mockResolvedValueOnce({ items: [] });
    await renderPage();
    expect(screen.getByTestId("newsletter-signup")).toBeInTheDocument();
  });
});

describe("SpringSalePage — metadata", () => {
  it("exports a Spring-Sale-specific title + description", async () => {
    const { metadata } = await import("@/app/spring-sale/page");
    expect(metadata.title as string).toMatch(/spring sale/i);
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });
});

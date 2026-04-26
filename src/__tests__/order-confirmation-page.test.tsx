import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";

const orderMocks = vi.hoisted(() => ({ getOrder: vi.fn() }));

vi.mock("@/lib/wix/orders", () => ({ getOrder: orderMocks.getOrder }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/components/analytics/MetaPurchaseTracker", () => ({
  MetaPurchaseTracker: () => null,
}));
vi.mock("@/components/analytics/Ga4PurchaseTracker", () => ({
  Ga4PurchaseTracker: () => null,
}));
vi.mock("@/components/site/NewsletterSignup", () => ({
  NewsletterSignup: () => <div data-testid="newsletter-signup" />,
}));

const MOCK_ORDER = {
  _id: "ord-1",
  number: "CF-1001",
  currency: "USD",
  lineItems: [
    {
      _id: "li-1",
      productName: { original: "Mesa 1000 Futon" },
      quantity: 1,
      price: { formattedAmount: "$599.00", amount: "599.00" },
      priceBeforeDiscounts: { amount: "599.00" },
      catalogReference: { catalogItemId: "prod-abc" },
      image: null,
    },
  ],
  priceSummary: {
    subtotal: { formattedAmount: "$599.00", amount: "599.00" },
    shipping: { formattedAmount: "$0.00", amount: "0.00" },
    tax: { formattedAmount: "$47.92", amount: "47.92" },
    total: { formattedAmount: "$646.92", amount: "646.92" },
  },
  shippingInfo: {
    logistics: {
      shippingDestination: {
        address: {
          addressLine: "123 Main St",
          city: "Hendersonville",
          subdivision: "NC",
          postalCode: "28792",
          country: "US",
        },
      },
    },
  },
  billingInfo: {
    address: {
      addressLine: "123 Main St",
      city: "Hendersonville",
      subdivision: "NC",
      postalCode: "28792",
      country: "US",
    },
  },
};

beforeEach(() => {
  orderMocks.getOrder.mockReset();
  // mockClear preserves the throw implementation; mockReset would erase it
  vi.mocked(redirect).mockClear();
});

async function renderPage(orderId?: string) {
  const { default: Page } = await import("@/app/order-confirmation/page");
  const searchParams = Promise.resolve({ orderId });
  const ui = await Page({ searchParams });
  return render(ui);
}

describe("OrderConfirmationPage — redirects", () => {
  it("redirects when orderId is missing", async () => {
    await expect(renderPage(undefined)).rejects.toThrow("missing-order-id");
    expect(redirect).toHaveBeenCalledWith("/shop?error=missing-order-id");
  });

  it("redirects when order is not found", async () => {
    orderMocks.getOrder.mockResolvedValueOnce(null);
    await expect(renderPage("bad-id")).rejects.toThrow("order-not-found");
    expect(redirect).toHaveBeenCalledWith("/shop?error=order-not-found");
  });
});

describe("OrderConfirmationPage — header", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("shows order confirmed badge", async () => {
    await renderPage("ord-1");
    expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
  });

  it("shows order number", async () => {
    await renderPage("ord-1");
    expect(screen.getByText(/CF-1001/)).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — brenda message", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("renders brenda message section", async () => {
    await renderPage("ord-1");
    expect(screen.getByTestId("brenda-message")).toBeInTheDocument();
  });

  it("contains 'A note from Brenda' heading", async () => {
    await renderPage("ord-1");
    expect(screen.getByText(/a note from brenda/i)).toBeInTheDocument();
  });

  it("contains phone link", async () => {
    await renderPage("ord-1");
    const link = screen.getByRole("link", { name: /\(\d{3}\)/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("tel:"));
  });
});

describe("OrderConfirmationPage — delivery timeline", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("renders delivery timeline section", async () => {
    await renderPage("ord-1");
    expect(screen.getByTestId("delivery-timeline")).toBeInTheDocument();
  });

  it("shows all 4 delivery steps", async () => {
    await renderPage("ord-1");
    expect(screen.getByText(/order received/i)).toBeInTheDocument();
    expect(screen.getByText(/handcrafted & packed/i)).toBeInTheDocument();
    expect(screen.getByText(/shipped/i)).toBeInTheDocument();
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — line items", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("shows line item name", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Mesa 1000 Futon")).toBeInTheDocument();
  });

  it("shows line item price", async () => {
    await renderPage("ord-1");
    // $599.00 appears in both the line item and the subtotal row
    expect(screen.getAllByText("$599.00").length).toBeGreaterThanOrEqual(1);
  });
});

describe("OrderConfirmationPage — totals", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("shows subtotal row", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("shows total row", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$646.92")).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — social share", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("renders social share section", async () => {
    await renderPage("ord-1");
    expect(screen.getByTestId("social-share")).toBeInTheDocument();
  });

  it("shows Facebook, Pinterest, Instagram links but not TikTok", async () => {
    await renderPage("ord-1");
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pinterest" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
  });

  it("social links open in new tab with noopener", async () => {
    await renderPage("ord-1");
    const fbLink = screen.getByRole("link", { name: "Facebook" });
    expect(fbLink).toHaveAttribute("target", "_blank");
    expect(fbLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("OrderConfirmationPage — newsletter", () => {
  beforeEach(() => orderMocks.getOrder.mockResolvedValue(MOCK_ORDER));

  it("renders newsletter section", async () => {
    await renderPage("ord-1");
    expect(screen.getByTestId("newsletter-section")).toBeInTheDocument();
  });

  it("renders NewsletterSignup component", async () => {
    await renderPage("ord-1");
    expect(screen.getByTestId("newsletter-signup")).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — no cf-* color drift", () => {
  it("page file contains no zinc- classes", async () => {
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const testDir = dirname(fileURLToPath(import.meta.url));
    const content = readFileSync(
      join(testDir, "../app/order-confirmation/page.tsx"),
      "utf8",
    );
    const zincMatches = content.match(/\bzinc-\d+\b/g);
    expect(zincMatches).toBeNull();
  });
});

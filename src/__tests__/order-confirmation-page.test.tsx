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

const metaMock = vi.hoisted(() => ({ render: vi.fn(() => null) }));
const ga4Mock = vi.hoisted(() => ({ render: vi.fn(() => null) }));

vi.mock("@/components/analytics/MetaPurchaseTracker", () => ({
  MetaPurchaseTracker: metaMock.render,
}));
vi.mock("@/components/analytics/Ga4PurchaseTracker", () => ({
  Ga4PurchaseTracker: ga4Mock.render,
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
  orderMocks.getOrder.mockResolvedValue(MOCK_ORDER);
  metaMock.render.mockReset().mockReturnValue(null);
  ga4Mock.render.mockReset().mockReturnValue(null);
  // mockClear (not mockReset) so the NEXT_REDIRECT throw implementation survives between tests
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

describe("OrderConfirmationPage — analytics gate", () => {
  it("fires both trackers for a valid order", async () => {
    await renderPage("ord-1");
    expect(metaMock.render).toHaveBeenCalledOnce();
    expect(ga4Mock.render).toHaveBeenCalledOnce();
  });

  it("suppresses trackers when currency is missing", async () => {
    orderMocks.getOrder.mockResolvedValueOnce({ ...MOCK_ORDER, currency: "" });
    await renderPage("ord-1");
    expect(metaMock.render).not.toHaveBeenCalled();
    expect(ga4Mock.render).not.toHaveBeenCalled();
  });

  it("suppresses trackers when total amount is zero", async () => {
    orderMocks.getOrder.mockResolvedValueOnce({
      ...MOCK_ORDER,
      priceSummary: {
        ...MOCK_ORDER.priceSummary,
        total: { formattedAmount: "$0.00", amount: "0" },
      },
    });
    await renderPage("ord-1");
    expect(metaMock.render).not.toHaveBeenCalled();
    expect(ga4Mock.render).not.toHaveBeenCalled();
  });

  it("suppresses trackers when total amount is non-numeric", async () => {
    orderMocks.getOrder.mockResolvedValueOnce({
      ...MOCK_ORDER,
      priceSummary: {
        ...MOCK_ORDER.priceSummary,
        total: { formattedAmount: "", amount: "" },
      },
    });
    await renderPage("ord-1");
    expect(metaMock.render).not.toHaveBeenCalled();
    expect(ga4Mock.render).not.toHaveBeenCalled();
  });
});

describe("OrderConfirmationPage — header", () => {
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
  it("shows subtotal row", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("shows tax row", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("$47.92")).toBeInTheDocument();
  });

  it("shows total row", async () => {
    await renderPage("ord-1");
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$646.92")).toBeInTheDocument();
  });

  it("hides tax row when tax is empty", async () => {
    orderMocks.getOrder.mockResolvedValueOnce({
      ...MOCK_ORDER,
      priceSummary: { ...MOCK_ORDER.priceSummary, tax: { formattedAmount: "", amount: "0" } },
    });
    await renderPage("ord-1");
    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — address fallback", () => {
  it("shows dash when shipping address is missing", async () => {
    orderMocks.getOrder.mockResolvedValueOnce({
      ...MOCK_ORDER,
      shippingInfo: undefined,
    });
    await renderPage("ord-1");
    // AddressBlock renders — when no address
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("OrderConfirmationPage — social share", () => {
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

  it("social links open in new tab with noopener on all platforms", async () => {
    await renderPage("ord-1");
    for (const name of ["Facebook", "Pinterest", "Instagram"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});

describe("OrderConfirmationPage — newsletter", () => {
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
    const content = readFileSync(join(testDir, "../app/order-confirmation/page.tsx"), "utf8");
    expect(content).not.toMatch(/\bzinc-\d+\b/);
  });
});

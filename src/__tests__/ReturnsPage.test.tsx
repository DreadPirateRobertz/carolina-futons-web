import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-5yg: ReturnsPage became async to read returns.* copy from SiteContent.
// Stub getSiteContent so tests fall back to hardcoded defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

import ReturnsPage, { metadata } from "@/app/returns/page";
import { BUSINESS } from "@/lib/business/contact-info";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: unknown, fallback: unknown) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const element = await ReturnsPage();
  return render(element);
}

describe("ReturnsPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/returns/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("ReturnsPage — rendering", () => {
  it("renders the primary h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /returns/i }),
    ).toBeInTheDocument();
  });

  it("states the 30-day return window", async () => {
    await renderPage();
    expect(screen.getByText(/30 days of delivery/i)).toBeInTheDocument();
  });

  it("renders a restocking region", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /restocking and return shipping/i }),
    ).toBeInTheDocument();
  });

  it("renders a custom/made-to-order region noting final-sale status", async () => {
    await renderPage();
    const region = screen.getByRole("region", { name: /custom and made-to-order/i });
    expect(region.textContent).toMatch(/final sale/i);
  });

  it("renders a damaged-on-arrival region with a 48-hour claim window", async () => {
    await renderPage();
    const region = screen.getByRole("region", { name: /damaged on arrival/i });
    expect(region.textContent).toMatch(/48 hours/i);
  });

  it("surfaces the store phone + email as contact links", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: BUSINESS.phone })).toBeInTheDocument();
    const emailLinks = screen.getAllByRole("link", { name: BUSINESS.email });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("constrains body copy to the 65ch measure", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });
});

// cfw-5yg: owner-editable copy wired to getSiteContent (returns.* keys)
describe("ReturnsPage — owner-editable copy (cfw-5yg)", () => {
  it("falls back to baked-in headings when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /Returns/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /The return window/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Restocking and return shipping/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Custom and made-to-order items/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Damaged on arrival/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Common returns questions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Start a return/i })).toBeInTheDocument();
  });

  it("renders returns.eyebrow fallback 'Policies' when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByText("Policies")).toBeInTheDocument();
  });

  it("uses CMS values for headings when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "returns.eyebrow") return "Our policies";
      if (key === "returns.intro.heading") return "Returns & exchanges";
      if (key === "returns.window.heading") return "30-day window";
      if (key === "returns.restocking.heading") return "Fees & shipping";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Our policies")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Returns & exchanges" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "30-day window" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Fees & shipping" }),
    ).toBeInTheDocument();
  });

  it("renders returns.window.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "returns.window.body")
        return "Items may be returned within 30 days in original condition.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText("Items may be returned within 30 days in original condition."),
    ).toBeInTheDocument();
  });

  it("renders returns.intro.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "returns.intro.body") return "We make returns easy.";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("We make returns easy.")).toBeInTheDocument();
  });

  it("queries the 12 expected returns.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "returns.eyebrow",
        "returns.intro.heading",
        "returns.intro.body",
        "returns.window.heading",
        "returns.window.body",
        "returns.restocking.heading",
        "returns.restocking.body-1",
        "returns.restocking.body-2",
        "returns.custom.heading",
        "returns.damaged.heading",
        "returns.faq.heading",
        "returns.start.heading",
      ]),
    );
  });
});

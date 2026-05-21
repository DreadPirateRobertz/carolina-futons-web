import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/env", () => ({
  optionalEnv: () => "https://www.carolinafutons.com",
  env: (k: string) => k,
}));

const mockListSwatchesAction = vi.fn();
const mockSubmitSwatchRequestAction = vi.fn();
vi.mock("@/app/actions/swatch-request", () => ({
  listSwatchesAction: (...args: unknown[]) => mockListSwatchesAction(...args),
  submitSwatchRequestAction: (...args: unknown[]) =>
    mockSubmitSwatchRequestAction(...args),
}));

// TurnstileWidget renders null when site key is absent — suppress in tests.
vi.mock("@/components/captcha/TurnstileWidget", () => ({
  TurnstileWidget: () => null,
}));

// cfw-z6n: SwatchRequestPage reads swatch.* keys from SiteContent.
// Stub getSiteContent so the helper falls back to defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

import SwatchRequestPage from "@/app/swatch-request/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: unknown, fallback: unknown) => fallback);
  mockListSwatchesAction.mockResolvedValue({ items: [], error: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const element = await SwatchRequestPage({
    searchParams: Promise.resolve({}),
  });
  return render(element);
}

describe("SwatchRequestPage — swatchLoadError branch", () => {
  it("shows error alert and hides form when CMS fails to load swatches", async () => {
    mockListSwatchesAction.mockResolvedValue({ items: [], error: true });
    const element = await SwatchRequestPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.getByRole("alert")).toBeTruthy();
    // SwatchRequestForm is conditionally rendered only when !swatchLoadError
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("renders form when swatches load successfully", async () => {
    mockListSwatchesAction.mockResolvedValue({
      items: [
        { _id: "s1", swatchName: "Navy", colorFamily: "Blue", colorHex: "#001f5b" },
      ],
      error: false,
    });
    const element = await SwatchRequestPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// cfw-z6n: owner-editable copy wired to getSiteContent (swatch.* keys)
describe("SwatchRequestPage — owner-editable copy (cfw-z6n)", () => {
  it("falls back to baked-in copy when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /Request fabric swatches/i })).toBeInTheDocument();
    expect(screen.getByText("Free samples")).toBeInTheDocument();
    expect(
      screen.getByText(/Not sure which fabric is right for your space/i),
    ).toBeInTheDocument();
  });

  it("renders swatch.eyebrow fallback when SiteContent returns empty", async () => {
    await renderPage();
    expect(screen.getByText("Free samples")).toBeInTheDocument();
  });

  it("uses CMS values for eyebrow, heading, and intro body when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "swatch.eyebrow") return "Free fabric samples";
      if (key === "swatch.heading") return "Try before you buy.";
      if (key === "swatch.intro.body") return "Pick up to five swatches, shipped free.";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Free fabric samples")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Try before you buy." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pick up to five swatches, shipped free.")).toBeInTheDocument();
  });

  it("renders swatch.intro.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "swatch.intro.body") return "Order up to five free swatches today.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText("Order up to five free swatches today."),
    ).toBeInTheDocument();
  });

  it("queries the 3 expected swatch.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "swatch.eyebrow",
        "swatch.heading",
        "swatch.intro.body",
      ]),
    );
  });
});

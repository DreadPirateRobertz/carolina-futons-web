import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-wv1: SurveyPage reads survey.* keys from SiteContent.
// Stub getSiteContent so tests fall back to hardcoded defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

// SurveyForm is a client component — stub to keep tests focused on page copy.
vi.mock("@/components/survey/SurveyForm", () => ({
  SurveyForm: ({ orderId }: { orderId?: string }) => (
    <form aria-label="survey form" data-order-id={orderId ?? ""} />
  ),
}));

import SurveyPage, { metadata } from "@/app/survey/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: unknown, fallback: unknown) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage(params: Record<string, string> = {}) {
  const element = await SurveyPage({ searchParams: Promise.resolve(params) });
  return render(element);
}

describe("SurveyPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/feedback/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("SurveyPage — rendering", () => {
  it("renders the primary h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /How did we do/i }),
    ).toBeInTheDocument();
  });

  it("renders the intro body copy", async () => {
    await renderPage();
    expect(
      screen.getByText(/Your honest feedback helps us serve the next customer better/i),
    ).toBeInTheDocument();
  });

  it("mounts the SurveyForm", async () => {
    await renderPage();
    expect(screen.getByRole("form", { name: /survey form/i })).toBeInTheDocument();
  });

  it("renders the order number when orderId param is present", async () => {
    await renderPage({ orderId: "12345" });
    expect(screen.getByText(/Order #12345/)).toBeInTheDocument();
  });

  it("does not render the order line when orderId param is absent", async () => {
    await renderPage();
    expect(screen.queryByText(/Order #/)).toBeNull();
  });
});

// cfw-wv1: owner-editable copy wired to getSiteContent (survey.* keys)
describe("SurveyPage — owner-editable copy (cfw-wv1)", () => {
  it("falls back to baked-in copy when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "How did we do?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your honest feedback helps us serve the next customer better. It takes less than a minute.",
      ),
    ).toBeInTheDocument();
  });

  it("uses CMS heading when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "survey.heading") return "Tell us what you think";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Tell us what you think" }),
    ).toBeInTheDocument();
  });

  it("renders survey.intro.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "survey.intro.body") return "Share your experience — it only takes 30 seconds.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText("Share your experience — it only takes 30 seconds."),
    ).toBeInTheDocument();
  });

  it("queries the 2 expected survey.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining(["survey.heading", "survey.intro.body"]),
    );
  });
});

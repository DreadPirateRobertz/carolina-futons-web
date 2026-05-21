import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-mr7: GuidesIndexPage became async (getSiteContent wiring).
// Stub getSiteContent so tests run under jsdom with no Wix network calls.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

vi.mock("@/lib/discovery/guides", () => ({
  listGuides: vi.fn().mockResolvedValue([]),
}));

import GuidesIndexPage from "@/app/guides/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: string, fallback: string) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const ui = await GuidesIndexPage();
  return render(ui);
}

describe("GuidesIndexPage — fallback copy (cfw-mr7)", () => {
  it("renders the eyebrow fallback when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByText("Buying guides")).toBeInTheDocument();
  });

  it("renders the h1 fallback when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Figure out what you actually need/i }),
    ).toBeInTheDocument();
  });

  it("renders the subhead fallback when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByText(/35 years of answering the same questions/i),
    ).toBeInTheDocument();
  });
});

describe("GuidesIndexPage — CMS override (cfw-mr7)", () => {
  it("uses CMS values for eyebrow, heading, and subhead when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback: string) => {
      if (key === "guides.index.eyebrow") return "Shopping guides";
      if (key === "guides.index.heading") return "Find the right piece for your space";
      if (key === "guides.index.subhead") return "Answers from the showroom floor.";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Shopping guides")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Find the right piece for your space" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Answers from the showroom floor.")).toBeInTheDocument();
  });
});

describe("GuidesIndexPage — SiteContent key contract (cfw-mr7)", () => {
  it("queries the 3 expected guides.index.* keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]: string[]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "guides.index.eyebrow",
        "guides.index.heading",
        "guides.index.subhead",
      ]),
    );
  });
});

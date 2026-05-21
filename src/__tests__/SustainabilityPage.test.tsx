import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-p3j: SustainabilityPage reads sustainability.* keys from SiteContent.
// Stub getSiteContent so the helper falls back to hardcoded defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

// Stub listCollectionItems — no Wix client in jsdom. Returns empty so all
// three repeaters (stories, certifications, materials) fall back to their
// static FALLBACK consts, giving us stable DOM output for assertions.
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: vi.fn().mockResolvedValue([]),
}));

// JsonLd renders a <script> tag — stub it to keep the DOM clean.
vi.mock("@/components/seo/JsonLd", () => ({
  JsonLd: () => null,
}));

import SustainabilityPage, { metadata } from "@/app/sustainability/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: unknown, fallback: unknown) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const element = await SustainabilityPage();
  return render(element);
}

describe("SustainabilityPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/sustainability/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe("SustainabilityPage — rendering", () => {
  it("renders the primary h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Furniture that cares for the planet/i }),
    ).toBeInTheDocument();
  });

  it("renders the stories section", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /how we build it/i }),
    ).toBeInTheDocument();
  });

  it("renders the materials section", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /what we use/i }),
    ).toBeInTheDocument();
  });

  it("renders the carbon offset section", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /carbon offset program/i }),
    ).toBeInTheDocument();
  });

  it("renders the certifications section", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /certifications/i }),
    ).toBeInTheDocument();
  });

  it("renders the trade-in section", async () => {
    await renderPage();
    expect(
      screen.getByRole("region", { name: /trade-in program/i }),
    ).toBeInTheDocument();
  });

  it("renders the trade-in CTA link", async () => {
    await renderPage();
    expect(
      screen.getByRole("link", { name: /Ask about trade-in/i }),
    ).toBeInTheDocument();
  });

  it("renders fallback story rows when Wix collection is empty", async () => {
    await renderPage();
    expect(screen.getByText(/Sustainably sourced wood/i)).toBeInTheDocument();
    expect(screen.getByText(/Durable by design/i)).toBeInTheDocument();
  });

  it("renders fallback certifications when Wix collection is empty", async () => {
    await renderPage();
    expect(screen.getByText("FSC Certified")).toBeInTheDocument();
    expect(screen.getByText("GREENGUARD Gold")).toBeInTheDocument();
  });
});

// cfw-p3j: owner-editable marketing copy wired to getSiteContent
describe("SustainabilityPage — owner-editable copy (cfw-p3j)", () => {
  it("falls back to baked-in headings when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Furniture that cares for the planet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /How we build it/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /What we use/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Carbon offset program/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Certifications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Trade-in program/i }),
    ).toBeInTheDocument();
  });

  it("renders sustainability.eyebrow fallback 'Our promise' when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByText("Our promise")).toBeInTheDocument();
  });

  it("uses CMS values for headings when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "sustainability.eyebrow") return "Built to last";
      if (key === "sustainability.intro.heading") return "Green by design";
      if (key === "sustainability.stories.heading") return "Our materials story";
      if (key === "sustainability.tradein.heading") return "Give it a second life";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Built to last")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Green by design" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Our materials story" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Give it a second life" }),
    ).toBeInTheDocument();
  });

  it("renders sustainability.carbon.body CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "sustainability.carbon.body")
        return "We offset 100% of shipping emissions through verified reforestation.";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText(
        "We offset 100% of shipping emissions through verified reforestation.",
      ),
    ).toBeInTheDocument();
  });

  it("renders sustainability.tradein.cta-label CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key: unknown, fallback: unknown) => {
      if (key === "sustainability.tradein.cta-label") return "Start your trade-in";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("link", { name: "Start your trade-in" }),
    ).toBeInTheDocument();
  });

  it("queries the 13 expected sustainability.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "sustainability.eyebrow",
        "sustainability.intro.heading",
        "sustainability.intro.body",
        "sustainability.stories.heading",
        "sustainability.materials.heading",
        "sustainability.materials.subhead",
        "sustainability.carbon.heading",
        "sustainability.carbon.body",
        "sustainability.certs.heading",
        "sustainability.certs.subhead",
        "sustainability.tradein.heading",
        "sustainability.tradein.subhead",
        "sustainability.tradein.cta-label",
      ]),
    );
  });
});

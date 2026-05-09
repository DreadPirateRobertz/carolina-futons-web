import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));

const mockGetSiteContent = vi.fn(async (_key: string, fallback = "") => fallback);
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (key: string, fallback?: string) =>
    mockGetSiteContent(key, fallback ?? ""),
}));

import VisitPage from "@/app/visit/page";

async function renderPage() {
  return render(await VisitPage());
}

beforeEach(() => {
  mockGetSiteContent.mockClear();
  mockGetSiteContent.mockImplementation(
    async (_key: string, fallback = "") => fallback,
  );
});

describe("VisitPage — rendering", () => {
  it("renders Visit Us heading", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: /visit us/i })).toBeInTheDocument();
  });

  it("renders location section with address", async () => {
    await renderPage();
    expect(screen.getByRole("region", { name: /location/i })).toBeInTheDocument();
  });

  it("renders store hours section", async () => {
    await renderPage();
    expect(screen.getByRole("region", { name: /store hours/i })).toBeInTheDocument();
  });

  it("renders Get directions link pointing to Google Maps", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("maps.google.com"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("directions href URL-encodes the store address", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /get directions/i });
    const href = link.getAttribute("href") ?? "";
    // Encoded store name must appear somewhere in the query
    expect(href).toContain("Carolina");
    expect(href).toContain("Hendersonville");
  });

  it("map iframe has descriptive title", async () => {
    const { container } = await renderPage();
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("title")).toMatch(/map/i);
  });

  it("map iframe src URL-encodes the store address", async () => {
    const { container } = await renderPage();
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).toContain("maps.google.com");
    expect(src).toContain("Hendersonville");
  });

  it("renders shop CTA link to /shop", async () => {
    await renderPage();
    expect(
      screen.getByRole("link", { name: /browse all products/i }),
    ).toHaveAttribute("href", "/shop");
  });

  it("renders phone link with tel: href", async () => {
    await renderPage();
    const phoneLink = screen.getByRole("link", { name: /828/i });
    expect(phoneLink.getAttribute("href")).toMatch(/^tel:/);
  });

  it("renders email link with mailto: href", async () => {
    await renderPage();
    const mailLink = screen.getByRole("link", { name: /carolinafutons@gmail/i });
    expect(mailLink.getAttribute("href")).toMatch(/^mailto:/);
  });
});

describe("VisitPage — owner-editable hours (cf-h21g / cfw-66o.4)", () => {
  it("falls back to baked-in hours when SiteContent is empty", async () => {
    await renderPage();
    expect(screen.getByText("Sunday – Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday – Saturday")).toBeInTheDocument();
    expect(screen.getByText("10 am – 5 pm")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("uses SiteContent values when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "visit.hours.sun-tue") return "11 am – 6 pm";
      if (key === "visit.hours.wed-sat") return "12 pm – 4 pm";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("11 am – 6 pm")).toBeInTheDocument();
    expect(screen.getByText("12 pm – 4 pm")).toBeInTheDocument();
  });

  it("queries the two expected SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining(["visit.hours.sun-tue", "visit.hours.wed-sat"]),
    );
  });
});

// ── cfw-22e: remaining 8 visit.* keys (intro / location / hours / cta) ─────

describe("VisitPage — owner-editable visit.* copy (cfw-22e / cfw-66o)", () => {
  it("queries all 8 new visit.* keys with their fallback strings", async () => {
    await renderPage();
    const callMap = new Map<string, string>(
      mockGetSiteContent.mock.calls.map(
        ([key, fallback]) => [key, fallback ?? ""] as const,
      ),
    );
    expect(callMap.get("visit.intro.heading")).toBe("Visit Us");
    expect(callMap.get("visit.intro.body")).toMatch(/come try it in person/i);
    expect(callMap.get("visit.location.heading")).toBe("Location");
    expect(callMap.get("visit.hours.heading")).toBe("Store Hours");
    expect(callMap.get("visit.directions-button.label")).toBe("Get directions");
    expect(callMap.get("visit.cta.heading")).toBe("Ready to shop?");
    expect(callMap.get("visit.cta.body")).toMatch(/browse online first/i);
    expect(callMap.get("visit.cta.button-label")).toBe("Browse all products");
  });

  it("renders Brenda's edits when SiteContent returns overrides", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "visit.intro.heading") return "Come Say Hi";
      if (key === "visit.cta.heading") return "Find your futon";
      if (key === "visit.cta.button-label") return "Shop the showroom";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /come say hi/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /find your futon/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /shop the showroom/i }),
    ).toHaveAttribute("href", "/shop");
    // Original strings should be gone when an override is supplied.
    expect(
      screen.queryByRole("heading", { name: /^visit us$/i }),
    ).not.toBeInTheDocument();
  });
});

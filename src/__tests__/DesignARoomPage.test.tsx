import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-gpa: DesignARoomPage is now async (getSiteContent wiring). Stub
// getSiteContent so tests resolve under jsdom with no Wix network calls.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

// StargazingHero uses canvas/WebGL — stub under jsdom.
vi.mock("@/components/mascot/StargazingHero", () => ({
  StargazingHero: () => <div data-testid="stargazing-hero" />,
}));

import { DESIGN_STEPS } from "@/lib/design-a-room/steps";
import DesignARoomPage, { metadata } from "@/app/design-a-room/page";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: string, fallback: string) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const ui = await DesignARoomPage();
  return render(ui);
}

// cf-gl7p: Design a Room page with RoomPlannerCanvas, DESIGN_STEPS config,
// and appointment booking link to /contact#appointment-form.

describe("DesignARoomPage — metadata", () => {
  it("exports metadata with a Carolina Futons-scoped title", () => {
    expect(metadata.title).toMatch(/Design a Room.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });
});

describe("DesignARoomPage — rendering (cf-gl7p)", () => {
  it("renders the hero h1", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /design a room around a futon/i,
      }),
    ).toBeTruthy();
  });

  it("renders the Hendersonville showroom address, phone, and hours", async () => {
    await renderPage();
    expect(screen.getByText(/824 Locust.*Hendersonville/i)).toBeTruthy();
    expect(screen.getAllByText(/\(828\) 252-9449/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wed–Sat, 10am–5pm/i).length).toBeGreaterThan(0);
  });

  it("exposes real CTA paths — phone link, email link, no form", async () => {
    await renderPage();
    const phoneLinks = screen.getAllByRole("link", { name: /\(828\) 252-9449/ });
    expect(phoneLinks.length).toBeGreaterThan(0);
    expect(phoneLinks[0].getAttribute("href")).toBe("tel:+18282529449");

    const emailLinks = screen.getAllByRole("link", { name: /carolinafutons@gmail\.com/ });
    expect(emailLinks.length).toBeGreaterThan(0);
    expect(emailLinks[0].getAttribute("href")).toBe("mailto:carolinafutons@gmail.com");

    expect(screen.queryByRole("button", { name: /send message/i })).toBeNull();
  });

  it("renders the room planner canvas section with dimension inputs and drag palette", async () => {
    await renderPage();
    expect(screen.getByLabelText(/room width/i)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText(/room depth/i)).toHaveAttribute("type", "number");
    expect(screen.getByText(/drag a piece into the room/i)).toBeInTheDocument();
  });

  it("renders the room planner canvas as an application landmark with accessible label", async () => {
    await renderPage();
    expect(
      screen.getByRole("application", { name: /drag furniture pieces into the room/i }),
    ).toBeInTheDocument();
  });

  it("renders a Book a showroom visit heading with link to /contact#appointment-form", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: /book a showroom visit/i })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /request an appointment/i });
    expect(link.getAttribute("href")).toBe("/contact#appointment-form");
  });

  it("renders DESIGN_STEPS titles in the How it works section", async () => {
    await renderPage();
    for (const step of DESIGN_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });
});

describe("DesignARoomPage — CMS override (cfw-gpa)", () => {
  it("uses CMS values for headings and CTA when present", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback: string) => {
      if (key === "design-a-room.intro.eyebrow") return "Complimentary consultation";
      if (key === "design-a-room.intro.heading") return "Build your perfect room";
      if (key === "design-a-room.intro.body") return "We have 35 years of showroom experience.";
      if (key === "design-a-room.book.heading") return "Schedule your visit";
      if (key === "design-a-room.book.cta-label") return "Book now";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Complimentary consultation")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Build your perfect room" }),
    ).toBeInTheDocument();
    expect(screen.getByText("We have 35 years of showroom experience.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Schedule your visit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book now" })).toBeInTheDocument();
  });
});

describe("DesignARoomPage — SiteContent key contract (cfw-gpa)", () => {
  it("queries all 12 design-a-room.* keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]: string[]) => key);
    expect(keys).toHaveLength(12);
    expect(keys).toEqual(
      expect.arrayContaining([
        "design-a-room.intro.eyebrow",
        "design-a-room.intro.heading",
        "design-a-room.intro.body",
        "design-a-room.scene.heading",
        "design-a-room.scene.body",
        "design-a-room.planner.heading",
        "design-a-room.planner.body",
        "design-a-room.steps.heading",
        "design-a-room.book.heading",
        "design-a-room.book.body",
        "design-a-room.book.cta-label",
        "design-a-room.other-ways.heading",
      ]),
    );
  });
});

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-7pk0 F2: ContactPage became async to read showroom hours from
// SiteContent (single source of truth shared with /visit). Tests now
// `await ContactPage()` to resolve the server-component promise, and
// stub getSiteContent so the helper falls back to defaults under jsdom.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

import ContactPage, { metadata } from "@/app/contact/page";
import { BUSINESS } from "@/lib/business/contact-info";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  // Default: SiteContent empty → fallbacks return whatever the caller
  // passed (Brenda's #475 published schedule: sun-tue open, wed-sat
  // Closed).
  mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const ui = await ContactPage();
  return render(ui);
}

describe("ContactPage — metadata", () => {
  it("exports a title + description", () => {
    expect(metadata.title).toMatch(/contact/i);
    expect(metadata.description).toBeTruthy();
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });
});

describe("ContactPage — rendering", () => {
  it("renders the primary h1 heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /love to hear from you/i }),
    ).toBeInTheDocument();
  });

  it("renders the direct-contact region with address, phone, email", async () => {
    await renderPage();
    const region = screen.getByRole("region", { name: /reach us directly/i });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toContain(BUSINESS.phone);
    expect(region.textContent).toContain(BUSINESS.email);
    expect(region.textContent).toContain(BUSINESS.street);
    expect(region.textContent).toContain(BUSINESS.city);
    expect(region.textContent).toContain(BUSINESS.zip);
  });

  it("uses the Gmail business inbox, not a vanity-domain address", () => {
    // Guards against an accidental flip to hello@carolinafutons.com (mayor
    // flagged this as a data bug during PR #83 review — the domain isn't
    // owned, so mail would black-hole).
    expect(BUSINESS.email).toBe("carolinafutons@gmail.com");
    expect(BUSINESS.emailHref).toBe("mailto:carolinafutons@gmail.com");
  });

  it("renders a tel: link for the phone number", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: BUSINESS.phone });
    expect(link.getAttribute("href")).toBe(BUSINESS.phoneHref);
  });

  it("renders a mailto: link for the email", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: BUSINESS.email });
    expect(link.getAttribute("href")).toBe(BUSINESS.emailHref);
  });

  it("mounts the contact form", async () => {
    await renderPage();
    expect(
      screen.getByRole("form", { name: /contact form/i }),
    ).toBeInTheDocument();
  });

  it("constrains body copy to a 65ch Article-whitespace measure", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("article")?.className).toMatch(/max-w-\[65ch\]/);
  });

  it("renders the FogScene hero above the article", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("[data-slot='fog-scene']")).not.toBeNull();
  });

  // cfw-eqk: visual phone/mail icon next to each tel:/mailto: link.
  it("renders a Lucide Phone icon inside the phone link (aria-hidden)", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: BUSINESS.phone });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a Lucide Mail icon inside the email link (aria-hidden)", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: BUSINESS.email });
    const svg = link.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

// cf-7pk0 F2 — showroom-hours single-source-of-truth contract.
// Pre-fix, /contact line 97 hardcoded "Wednesday through Saturday,
// 10 am–5 pm" while /visit's published-schedule fallback said wed-sat
// is "Closed" — sending customers to a closed showroom on Saturday.
// This describe block pins that /contact now reads through SiteContent
// (no drift) and the regression-pin asserts the stale string is gone.
describe("ContactPage — showroom schedule (cf-7pk0 F2)", () => {
  it("renders the schedule line composed from canonical SiteContent fallbacks", async () => {
    await renderPage();
    // Per Brenda's #475 published schedule (the canonical fallback):
    // sun-tue 10 am – 5 pm; wed-sat Closed.
    expect(
      screen.getByText(
        /Open Sunday through Tuesday, 10 am – 5 pm\. Closed Wednesday through Saturday\./,
      ),
    ).toBeInTheDocument();
  });

  it("does NOT render the pre-fix stale 'Wednesday through Saturday, 10 am–5 pm' copy", async () => {
    // Regression pin against the production-bug copy that was on line 97
    // pre-fix. If a future revert re-introduces it, this fails loud.
    await renderPage();
    expect(
      screen.queryByText(/Wednesday through Saturday, 10\s*am[–\-]5\s*pm/i),
    ).toBeNull();
  });

  it("reflects SiteContent live values when Brenda updates wed-sat hours", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "visit.hours.sun-tue") return "10 am – 5 pm";
      if (key === "visit.hours.wed-sat") return "12 pm – 4 pm";
      return fallback;
    });
    await renderPage();
    expect(
      screen.getByText(
        /Open Sunday through Tuesday, 10 am – 5 pm\. Open Wednesday through Saturday, 12 pm – 4 pm\./,
      ),
    ).toBeInTheDocument();
  });

  it("queries the canonical visit.hours.* keys (single source of truth shared with /visit)", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining(["visit.hours.sun-tue", "visit.hours.wed-sat"]),
    );
  });
});

// cfw-4ul: pin the 7 contact.* SiteContent keys wired by cf-bbu5.
// Pattern mirrors AboutPage — cf-7pk0 F1 (about/page.test.tsx).
describe("ContactPage — owner-editable copy (cf-bbu5)", () => {
  it("falls back to baked-in headings when SiteContent is empty", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /love to hear from you/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Reach us directly/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Schedule a showroom visit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Send a message/i }),
    ).toBeInTheDocument();
  });

  it("uses CMS values for headings when present", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "contact.eyebrow") return "Get in touch";
      if (key === "contact.intro.heading") return "How can we help?";
      if (key === "contact.intro.body") return "We reply same business day.";
      if (key === "contact.direct.heading") return "Call or email us";
      if (key === "contact.appointment.heading") return "Book a visit";
      if (key === "contact.form.heading") return "Leave a note";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText("Get in touch")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "How can we help?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("We reply same business day.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Call or email us" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Book a visit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Leave a note" }),
    ).toBeInTheDocument();
  });

  it("renders the contact.eyebrow fallback when SiteContent is empty", async () => {
    await renderPage();
    // Eyebrow is a <p> above the h1. The fallback is the literal "Contact" label.
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders contact.appointment.body-suffix CMS override when getSiteContent returns a non-fallback value", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "contact.appointment.body-suffix")
        return " Slots fill up fast — book early.";
      return fallback;
    });
    await renderPage();
    expect(screen.getByText(/ Slots fill up fast — book early\./)).toBeInTheDocument();
  });

  it("queries the 7 expected contact.* SiteContent keys", async () => {
    await renderPage();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "contact.eyebrow",
        "contact.intro.heading",
        "contact.intro.body",
        "contact.direct.heading",
        "contact.appointment.heading",
        "contact.appointment.body-suffix",
        "contact.form.heading",
      ]),
    );
  });
});

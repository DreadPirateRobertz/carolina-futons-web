import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// trackCustomEvent is the velo wrapper fired on /winback render. Mocked here
// so tests assert the call shape without a live RPC.
const trackMocks = vi.hoisted(() => ({
  trackCustomEvent: vi.fn<
    (eventName: string, params?: Record<string, unknown>) => Promise<{ success: boolean }>
  >(async () => ({ success: true })),
}));

vi.mock("@/lib/wix/custom-events", () => ({
  trackCustomEvent: trackMocks.trackCustomEvent,
}));

// NewsletterSignup pulls in a Server Action chain (newsletter-store, file IO).
// Stub it out so the page renders in isolation.
vi.mock("@/components/site/NewsletterSignup", () => ({
  NewsletterSignup: () => <form data-testid="newsletter-stub" aria-label="Newsletter signup" />,
}));

beforeEach(() => {
  trackMocks.trackCustomEvent.mockClear();
  trackMocks.trackCustomEvent.mockResolvedValue({ success: true });
});

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  const { default: WinbackPage } = await import("@/app/winback/page");
  const ui = await WinbackPage({ searchParams: Promise.resolve(searchParams) });
  return render(ui);
}

describe("WinbackPage — render", () => {
  it("renders the hero heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /we miss you/i }),
    ).toBeInTheDocument();
  });

  it("renders the primary shop CTA linking to /shop", async () => {
    await renderPage();
    const cta = screen.getByTestId("winback-shop-cta");
    expect(cta.getAttribute("href")).toBe("/shop");
  });

  it("renders the value-prop section with three items", async () => {
    await renderPage();
    const values = screen.getByRole("heading", { name: /what you came here for/i });
    expect(values).toBeInTheDocument();
    const items = screen
      .getAllByRole("listitem")
      .filter((el) => el.querySelector("h3"));
    expect(items.length).toBe(3);
  });

  it("renders the newsletter signup form", async () => {
    await renderPage();
    expect(screen.getByTestId("newsletter-stub")).toBeInTheDocument();
  });
});

describe("WinbackPage — UTM tracking", () => {
  it("logs winback_landing_view with the UTM payload from searchParams", async () => {
    await renderPage({
      utm_source: "email",
      utm_medium: "drip",
      utm_campaign: "winback-q2",
      utm_content: "hero-cta",
      utm_term: "lapsed-90d",
    });
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledTimes(1);
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledWith(
      "winback_landing_view",
      expect.objectContaining({
        source: "winback",
        utm_source: "email",
        utm_medium: "drip",
        utm_campaign: "winback-q2",
        utm_content: "hero-cta",
        utm_term: "lapsed-90d",
      }),
    );
  });

  it("only includes UTM keys present in searchParams", async () => {
    await renderPage({ utm_source: "email", utm_campaign: "winback-q2" });
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledWith(
      "winback_landing_view",
      {
        source: "winback",
        utm_source: "email",
        utm_campaign: "winback-q2",
      },
    );
  });

  it("ignores unrelated query params", async () => {
    await renderPage({ ref: "twitter", utm_source: "email" });
    const [, payload] = trackMocks.trackCustomEvent.mock.calls[0];
    expect(payload).not.toHaveProperty("ref");
    expect(payload).toMatchObject({ source: "winback", utm_source: "email" });
  });

  it("drops UTM values that are arrays (repeated query keys)", async () => {
    await renderPage({ utm_source: ["email", "email"] });
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledWith(
      "winback_landing_view",
      { source: "winback" },
    );
  });

  it("renders without UTM params and still fires the visit event", async () => {
    await renderPage();
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledWith(
      "winback_landing_view",
      { source: "winback" },
    );
  });

  it("drops UTM values that are empty strings", async () => {
    await renderPage({ utm_source: "" });
    expect(trackMocks.trackCustomEvent).toHaveBeenCalledWith(
      "winback_landing_view",
      { source: "winback" },
    );
  });

  it("still renders the page when tracking returns success:false", async () => {
    trackMocks.trackCustomEvent.mockResolvedValueOnce({ success: false });
    await renderPage({ utm_source: "email" });
    expect(
      screen.getByRole("heading", { level: 1, name: /we miss you/i }),
    ).toBeInTheDocument();
  });
});

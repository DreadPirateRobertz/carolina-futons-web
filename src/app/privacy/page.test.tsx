import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Privacy page is now an async server component (reads cf_consent cookie).
// Stub next/headers so tests run without a real server context.
const cookieMock = vi.hoisted(() => ({ get: vi.fn(() => undefined) }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieMock),
}));

// Stub ConsentPreferences so tests don't need full client-component setup.
vi.mock("@/components/analytics/ConsentPreferences", () => ({
  ConsentPreferences: () => <div data-testid="consent-preferences-stub" />,
}));

afterEach(() => {
  cleanup();
  cookieMock.get.mockReset().mockReturnValue(undefined);
});

async function renderPage() {
  const { default: Page } = await import("./page");
  const ui = await Page();
  return render(ui);
}

describe("PrivacyPolicyPage — smoke", () => {
  it("exports metadata.title for the /privacy tab/SEO", async () => {
    const { metadata } = await import("./page");
    expect(metadata.title).toBe("Privacy Policy — Carolina Futons");
  });

  it("renders an h1 naming the page", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
    ).toBeDefined();
  });

  it("exposes the carolinafutons@gmail.com mailto contact (compliance net)", async () => {
    await renderPage();
    const mailto = screen.getByRole("link", {
      name: /carolinafutons@gmail\.com/i,
    });
    expect(mailto.getAttribute("href")).toBe(
      "mailto:carolinafutons@gmail.com",
    );
  });

  it("renders the ConsentPreferences section", async () => {
    await renderPage();
    expect(screen.getByTestId("consent-preferences-stub")).toBeInTheDocument();
  });
});

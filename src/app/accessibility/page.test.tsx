import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import AccessibilityPage, { metadata } from "./page";

afterEach(() => cleanup());

describe("AccessibilityPage — smoke", () => {
  it("exports metadata.title for the /accessibility tab/SEO", () => {
    expect(metadata.title).toBe("Accessibility — Carolina Futons");
  });

  it("renders an h1 naming the page", () => {
    render(<AccessibilityPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /^accessibility$/i }),
    ).toBeDefined();
  });

  it("exposes the hello@carolinafutons.com mailto contact (compliance net)", () => {
    render(<AccessibilityPage />);
    const mailto = screen.getByRole("link", {
      name: /hello@carolinafutons\.com/i,
    });
    expect(mailto.getAttribute("href")).toBe(
      "mailto:hello@carolinafutons.com",
    );
  });
});

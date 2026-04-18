import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import PrivacyPolicyPage, { metadata } from "./page";

afterEach(() => cleanup());

describe("PrivacyPolicyPage — smoke", () => {
  it("exports metadata.title for the /privacy tab/SEO", () => {
    expect(metadata.title).toBe("Privacy Policy — Carolina Futons");
  });

  it("renders an h1 naming the page", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
    ).toBeDefined();
  });

  it("exposes the carolinafutons@gmail.com mailto contact (compliance net)", () => {
    render(<PrivacyPolicyPage />);
    const mailto = screen.getByRole("link", {
      name: /carolinafutons@gmail\.com/i,
    });
    expect(mailto.getAttribute("href")).toBe(
      "mailto:carolinafutons@gmail.com",
    );
  });
});

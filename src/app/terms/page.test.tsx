import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import TermsPage, { metadata } from "./page";

afterEach(() => cleanup());

describe("TermsPage — smoke", () => {
  it("exports metadata.title for the /terms tab/SEO", () => {
    expect(metadata.title).toBe("Terms of Service — Carolina Futons");
  });

  it("renders an h1 naming the page", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /terms of service/i }),
    ).toBeDefined();
  });

  it("exposes the hello@carolinafutons.com mailto contact (compliance net)", () => {
    render(<TermsPage />);
    const mailto = screen.getByRole("link", {
      name: /hello@carolinafutons\.com/i,
    });
    expect(mailto.getAttribute("href")).toBe(
      "mailto:hello@carolinafutons.com",
    );
  });
});

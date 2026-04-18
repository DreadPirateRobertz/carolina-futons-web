import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import BlogPage, { metadata } from "@/app/blog/page";

describe("BlogPage", () => {
  it("renders the journal headline as the H1", () => {
    render(<BlogPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /notes from the showroom/i }),
    ).toBeTruthy();
  });

  it("mentions Hendersonville and 1991 so the page reads as real CF content", () => {
    render(<BlogPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/Hendersonville/);
    expect(main.textContent).toMatch(/1991/);
  });

  it("links the contact email", () => {
    render(<BlogPage />);
    const link = screen.getByRole("link", { name: /hello@carolinafutons\.com/i });
    expect(link.getAttribute("href")).toBe("mailto:hello@carolinafutons.com");
  });

  it("exports a metadata object with title and description", () => {
    expect(metadata.title).toBe("Journal — Carolina Futons");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PressPage, { metadata } from "@/app/press/page";

describe("PressPage", () => {
  it("renders the press headline as the H1", () => {
    render(<PressPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /press.*media/i }),
    ).toBeTruthy();
  });

  it("includes the founding year, location, and warranty length", () => {
    render(<PressPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/1991/);
    expect(main.textContent).toMatch(/Hendersonville/);
    expect(main.textContent).toMatch(/15-year warranty/);
  });

  it("links the press contact email", () => {
    render(<PressPage />);
    const link = screen.getByRole("link", { name: /hello@carolinafutons\.com/i });
    expect(link.getAttribute("href")).toBe("mailto:hello@carolinafutons.com");
  });

  it("renders the showroom street address for press visitors", () => {
    render(<PressPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/1611 Brevard Road/);
  });

  it("exports a metadata object with title and description", () => {
    expect(metadata.title).toBe("Press — Carolina Futons");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });
});

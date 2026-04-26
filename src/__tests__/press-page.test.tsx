import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Stub the form action so PressPage can render server-side without exercising
// the Velo handoff in unit tests.
vi.mock("@/app/contact/actions", () => ({
  sendContactForm: vi.fn(async () => ({ status: "idle" })),
}));

import PressPage, { metadata, currentYear } from "@/app/press/page";

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
    const link = screen.getByRole("link", { name: /carolinafutons@gmail\.com/i });
    expect(link.getAttribute("href")).toBe("mailto:carolinafutons@gmail.com");
  });

  it("links the press contact phone number", () => {
    render(<PressPage />);
    const link = screen.getByRole("link", { name: /\(828\) 252-9449/ });
    expect(link.getAttribute("href")).toBe("tel:+18282529449");
  });

  it("renders the showroom street address for press visitors", () => {
    render(<PressPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/824 Locust Street/);
  });

  it("exports a metadata object with title and description", () => {
    expect(metadata.title).toBe("Press & Media — Carolina Futons");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });

  it("renders the years-in-business claim derived from currentYear()", () => {
    render(<PressPage />);
    const expected = `${currentYear() - 1991}-year-old`;
    expect(screen.getByRole("main").textContent).toContain(expected);
  });

  it("renders a 'Press inquiries' CTA that anchors to the form", () => {
    render(<PressPage />);
    const cta = screen.getByRole("link", { name: /^press inquiries$/i });
    expect(cta.getAttribute("href")).toBe("#press-inquiries");
  });

  it("renders the press-inquiries section with the matching anchor id", () => {
    render(<PressPage />);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: /send a press inquiry/i,
    });
    // Section element wrapping the form picks up the anchor id
    const section = heading.closest("section");
    expect(section?.getAttribute("id")).toBe("press-inquiries");
  });

  it("instructs press visitors to prefix the subject with [Press]", () => {
    render(<PressPage />);
    const section = screen
      .getByRole("heading", { level: 2, name: /send a press inquiry/i })
      .closest("section")!;
    expect(within(section).getByText(/\[Press\]/)).toBeTruthy();
  });

  it("renders the contact form (name, email, subject, message inputs)", () => {
    render(<PressPage />);
    // ContactForm uses textbox roles for these inputs; presence is enough
    // — full form behavior is covered by ContactForm.test.tsx.
    expect(screen.getByRole("textbox", { name: /^name$/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /^email$/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /^subject$/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /^message$/i })).toBeTruthy();
  });
});

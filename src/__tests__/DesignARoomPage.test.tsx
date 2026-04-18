import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import DesignARoomPage, { metadata } from "@/app/design-a-room/page";

// cf-3qt.8.D: smoke test pinning the Design-a-Room page contract —
// metadata export, h1, and real Carolina Futons contact info. No live
// consultation tool yet, so the page CTA is phone + email + in-person
// visit (no form).

describe("DesignARoomPage", () => {
  it("exports metadata with a Carolina Futons-scoped title", () => {
    expect(metadata.title).toMatch(/Design a Room.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });

  it("renders the hero h1", () => {
    render(<DesignARoomPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /design a room around a futon/i,
      }),
    ).toBeTruthy();
  });

  it("renders the Hendersonville showroom address, phone, and hours", () => {
    render(<DesignARoomPage />);
    expect(screen.getByText(/824 Locust St/i)).toBeTruthy();
    expect(screen.getAllByText(/\(828\) 252-9449/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Wed–Sat, 10am–5pm/i)).toBeTruthy();
  });

  it("exposes real CTA paths — phone link, email link, no form", () => {
    render(<DesignARoomPage />);
    const phoneLinks = screen.getAllByRole("link", {
      name: /\(828\) 252-9449/,
    });
    expect(phoneLinks.length).toBeGreaterThan(0);
    expect(phoneLinks[0].getAttribute("href")).toBe("tel:+18282529449");

    const emailLinks = screen.getAllByRole("link", {
      name: /carolinafutons@gmail\.com/,
    });
    expect(emailLinks.length).toBeGreaterThan(0);
    expect(emailLinks[0].getAttribute("href")).toBe(
      "mailto:carolinafutons@gmail.com",
    );

    // Intentional: no live form until the backend exists.
    expect(screen.queryByRole("button", { name: /send message/i })).toBeNull();
  });
});

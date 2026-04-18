import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import DesignARoomPage, { metadata } from "@/app/design-a-room/page";

// cf-3qt.8.D: smoke test pinning the Design-a-Room page contract —
// metadata export, h1, and real Carolina Futons contact info that the
// dispatch requires (1991 Hendersonville, showroom address, phone, hours).

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

  it("renders the Hendersonville showroom address and phone", () => {
    render(<DesignARoomPage />);
    expect(screen.getByText(/824 Locust St/i)).toBeTruthy();
    expect(screen.getAllByText(/\(828\) 252-9449/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Wed–Sat, 10am–5pm/i)).toBeTruthy();
  });

  it("renders the contact form with required fields", () => {
    render(<DesignARoomPage />);
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/tell us about the space/i)).toBeTruthy();
  });
});

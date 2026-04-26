import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DESIGN_STEPS } from "@/lib/design-a-room/steps";

import DesignARoomPage, { metadata } from "@/app/design-a-room/page";

// cf-gl7p: Design a Room page with RoomPlannerCanvas, DESIGN_STEPS config,
// and appointment booking link to /contact#appointment-form.

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
    expect(screen.getByText(/824 Locust.*Hendersonville/i)).toBeTruthy();
    expect(screen.getAllByText(/\(828\) 252-9449/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wed–Sat, 10am–5pm/i).length).toBeGreaterThan(0);
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

    expect(screen.queryByRole("button", { name: /send message/i })).toBeNull();
  });

  it("renders the room planner canvas section with dimension inputs and futon selector", () => {
    render(<DesignARoomPage />);
    expect(screen.getByLabelText(/room width/i)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText(/room depth/i)).toHaveAttribute("type", "number");
    const select = screen.getByLabelText(/futon.*bed size/i) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.options.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the room planner as an img landmark with accessible label", () => {
    render(<DesignARoomPage />);
    expect(screen.getByRole("img", { name: /room plan view/i })).toBeInTheDocument();
  });

  it("renders a Book a showroom visit heading with link to /contact#appointment-form", () => {
    render(<DesignARoomPage />);
    expect(
      screen.getByRole("heading", { name: /book a showroom visit/i }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /request an appointment/i });
    expect(link.getAttribute("href")).toBe("/contact#appointment-form");
  });

  it("renders DESIGN_STEPS titles in the How it works section", () => {
    render(<DesignARoomPage />);
    for (const step of DESIGN_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import GuidesIndexPage, { metadata } from "@/app/guides/page";
import { GUIDES } from "@/lib/discovery/guides";

// cf-3qt.8.D: smoke test pinning the Guides index contract — metadata export,
// h1, and a card link per GUIDES entry pointing at /guides/{slug}.

describe("GuidesIndexPage", () => {
  it("exports metadata with a buying-guides title", () => {
    expect(metadata.title).toMatch(/Buying Guides.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });

  it("renders the hero h1", () => {
    render(<GuidesIndexPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /figure out what you actually need/i,
      }),
    ).toBeTruthy();
  });

  it("renders a card link per GUIDES entry pointing at /guides/{slug}", () => {
    render(<GuidesIndexPage />);
    for (const guide of GUIDES) {
      const heading = screen.getByRole("heading", {
        level: 2,
        name: guide.title,
      });
      const link = heading.closest("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(`/guides/${guide.slug}`);
    }
  });
});

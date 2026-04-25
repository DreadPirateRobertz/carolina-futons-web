import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const listPosts = vi.fn();
vi.mock("@/lib/wix/blog", () => ({
  listPosts: (...args: unknown[]) => listPosts(...args),
}));

import BlogPage, { metadata } from "@/app/blog/page";

beforeEach(() => {
  listPosts.mockReset();
  // Default to empty so legacy assertions hit the "Coming soon" fallback,
  // which preserves the original CF brand copy (Hendersonville/1991, contact
  // email). Tests that need the post-list path mock listPosts inline.
  listPosts.mockResolvedValue([]);
});

describe("BlogPage", () => {
  it("renders the journal headline as the H1", async () => {
    const ui = await BlogPage();
    render(ui);
    expect(
      screen.getByRole("heading", { level: 1, name: /notes from the showroom/i }),
    ).toBeTruthy();
  });

  it("mentions Hendersonville and 1991 so the page reads as real CF content", async () => {
    const ui = await BlogPage();
    render(ui);
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/Hendersonville/);
    expect(main.textContent).toMatch(/1991/);
  });

  it("links the contact email in the empty-state fallback", async () => {
    const ui = await BlogPage();
    render(ui);
    const link = screen.getByRole("link", { name: /carolinafutons@gmail\.com/i });
    expect(link.getAttribute("href")).toBe("mailto:carolinafutons@gmail.com");
  });

  it("exports a metadata object with title and description", () => {
    expect(metadata.title).toBe("Journal — Carolina Futons");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });
});

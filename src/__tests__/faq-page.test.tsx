import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.4.1: smoke tests for the /faq page.
// Verifies: metadata export, H1, fallback empty state, live-data sections with
// <details>/<summary> disclosure elements, and per-category grouping.

const listFaqsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cms/faq", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cms/faq")>("@/lib/cms/faq");
  return { ...actual, listFaqs: listFaqsMock };
});

vi.mock("@/lib/seo/json-ld", async () => {
  // Keep the real resolveSiteUrl (used by metadata.alternates.canonical);
  // only buildFaqPageSchema is stubbed to keep the schema test focused.
  const actual =
    await vi.importActual<typeof import("@/lib/seo/json-ld")>(
      "@/lib/seo/json-ld",
    );
  return {
    ...actual,
    buildFaqPageSchema: () => ({ "@type": "FAQPage", mainEntity: [] }),
  };
});

vi.mock("@/components/seo/JsonLd", () => ({
  JsonLd: () => null,
}));

import FaqPage, { metadata } from "@/app/faq/page";

beforeEach(() => {
  listFaqsMock.mockReset();
  listFaqsMock.mockResolvedValue({ items: [] });
});

describe("FaqPage — metadata", () => {
  it("exports a metadata title containing 'FAQ'", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/FAQ/i);
  });

  it("exports a non-empty metadata description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });

  it("sets alternates.canonical to the /faq URL (cfw-pb1j)", () => {
    expect(String(metadata.alternates?.canonical)).toMatch(/\/faq$/);
  });
});

describe("FaqPage — structure", () => {
  it("renders the H1 with 'frequently asked questions'", async () => {
    render(await FaqPage());
    expect(
      screen.getByRole("heading", { level: 1, name: /frequently asked questions/i }),
    ).toBeTruthy();
  });

  it("links the CF contact email in the header prose", async () => {
    render(await FaqPage());
    const link = screen.getByRole("link", { name: /carolinafutons@gmail\.com/i });
    expect(link.getAttribute("href")).toBe("mailto:carolinafutons@gmail.com");
  });

  it("renders the empty-state message when no FAQs are returned", async () => {
    listFaqsMock.mockResolvedValue({ items: [] });
    render(await FaqPage());
    expect(screen.getByText(/still gathering questions/i)).toBeTruthy();
  });

  it("renders category sections with <details> disclosures for live FAQ items", async () => {
    listFaqsMock.mockResolvedValue({
      items: [
        { question: "Do you ship?", answer: "Yes.", category: "Shipping", sortOrder: 1 },
        { question: "Warranty?", answer: "Lifetime.", category: "Warranty", sortOrder: 2 },
      ],
    });
    const { container } = render(await FaqPage());
    expect(screen.getByRole("heading", { level: 2, name: /shipping/i })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: /warranty/i })).toBeTruthy();
    expect(container.querySelectorAll("details").length).toBe(2);
  });

  it("renders question text as <summary> inside each <details>", async () => {
    listFaqsMock.mockResolvedValue({
      items: [
        { question: "Do you offer returns?", answer: "30-day returns.", category: "Returns", sortOrder: 1 },
      ],
    });
    const { container } = render(await FaqPage());
    const summary = container.querySelector("summary");
    expect(summary?.textContent).toContain("Do you offer returns?");
  });

  it("renders the answer text inside the <details> body", async () => {
    listFaqsMock.mockResolvedValue({
      items: [
        { question: "Q?", answer: "The answer is 42.", category: "General", sortOrder: 1 },
      ],
    });
    render(await FaqPage());
    expect(screen.getByText(/the answer is 42/i)).toBeTruthy();
  });

  it("groups items from the same category under one <section>", async () => {
    listFaqsMock.mockResolvedValue({
      items: [
        { question: "Q1", answer: "A1", category: "Shipping", sortOrder: 1 },
        { question: "Q2", answer: "A2", category: "Shipping", sortOrder: 2 },
        { question: "Q3", answer: "A3", category: "Returns", sortOrder: 3 },
      ],
    });
    const { container } = render(await FaqPage());
    expect(container.querySelectorAll("section[aria-labelledby]").length).toBe(2);
    expect(container.querySelectorAll("details").length).toBe(3);
  });
});

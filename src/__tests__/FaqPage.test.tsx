import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.4.1: /faq page smoke + JSON-LD wiring.
//
// listFaqs is mocked so the test doesn't reach the Wix client. The
// JsonLd component is replaced with a marker so we can assert the
// schema id without booting the real <script> rendering path.

const listFaqs = vi.fn();
vi.mock("@/lib/cms/faq", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cms/faq")>(
    "@/lib/cms/faq",
  );
  return {
    ...actual,
    listFaqs: () => listFaqs(),
  };
});

vi.mock("@/components/seo/JsonLd", () => ({
  JsonLd: ({ id, schema }: { id: string; schema: unknown }) => (
    <div data-testid="json-ld" data-jsonld-id={id} data-schema={JSON.stringify(schema)} />
  ),
}));

import FaqPage, { metadata } from "@/app/faq/page";

beforeEach(() => {
  listFaqs.mockReset();
});

async function renderPage() {
  const ui = await FaqPage();
  render(ui);
}

describe("FaqPage", () => {
  it("exports metadata.title containing 'FAQ'", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/FAQ/);
  });

  it("renders an h1 naming the page", async () => {
    listFaqs.mockResolvedValueOnce({ items: [] });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /frequently asked/i }),
    ).toBeInTheDocument();
  });

  it("renders one section per category with collapsible <details> per question", async () => {
    listFaqs.mockResolvedValueOnce({
      items: [
        { category: "Shipping", question: "Do you ship?", answer: "Yes." },
        { category: "Shipping", question: "How fast?", answer: "Two weeks." },
        { category: "Returns", question: "Can I return?", answer: "Within 30 days." },
      ],
    });
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: /shipping/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /returns/i }),
    ).toBeInTheDocument();
    // Native <details>/<summary> — assert by visible question text.
    expect(screen.getByText(/do you ship\?/i)).toBeInTheDocument();
    expect(screen.getByText(/how fast\?/i)).toBeInTheDocument();
    expect(screen.getByText(/can i return\?/i)).toBeInTheDocument();
  });

  it("emits FAQPage JSON-LD with one Question per FAQ", async () => {
    listFaqs.mockResolvedValueOnce({
      items: [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
      ],
    });
    await renderPage();
    const jsonLd = screen.getByTestId("json-ld");
    expect(jsonLd.getAttribute("data-jsonld-id")).toBe("jsonld-faq");
    const schema = JSON.parse(jsonLd.getAttribute("data-schema") ?? "{}");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Q1",
      acceptedAnswer: { "@type": "Answer", text: "A1" },
    });
  });

  it("renders an empty-state message when listFaqs returns no items", async () => {
    listFaqs.mockResolvedValueOnce({ items: [] });
    await renderPage();
    expect(
      screen.getByText(/still gathering questions/i),
    ).toBeInTheDocument();
  });
});

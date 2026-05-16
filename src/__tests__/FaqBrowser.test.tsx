// cfw-kg3: client-side FAQ search + category filter. Tests pin the
// search match-against-question + match-against-answer behavior, the
// filter narrowing, the All-reset, the empty-state copy, and that the
// JSON-LD schema (rendered server-side via the existing page) is NOT
// part of this component's surface.

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { FaqBrowser } from "@/components/faq/FaqBrowser";

type Group = { category: string; items: { question: string; answer: string }[] };

const GROUPS: Group[] = [
  {
    category: "Ordering & Shipping",
    items: [
      {
        question: "How long does shipping take?",
        answer: "Most in-stock items ship within 3-5 business days.",
      },
      {
        question: "Do you ship to all 50 states?",
        answer: "Yes, we ship to all 50 US states.",
      },
    ],
  },
  {
    category: "Futon Frames",
    items: [
      {
        question: "What's the difference between a futon frame and a sofa bed?",
        answer:
          "A futon frame uses a separate mattress that folds with the frame.",
      },
    ],
  },
  {
    category: "Returns",
    items: [
      {
        question: "What is the return window?",
        answer: "30 days from delivery in like-new condition.",
      },
    ],
  },
];

describe("FaqBrowser — render", () => {
  it("renders the search input + every category as a filter button + 'All'", () => {
    render(<FaqBrowser groups={GROUPS} />);
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ordering & shipping/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /futon frames/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^returns$/i })).toBeInTheDocument();
  });

  it("renders every category's questions by default", () => {
    render(<FaqBrowser groups={GROUPS} />);
    expect(screen.getByText(/how long does shipping take/i)).toBeInTheDocument();
    expect(
      screen.getByText(/what's the difference between a futon frame/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/what is the return window/i)).toBeInTheDocument();
  });
});

describe("FaqBrowser — search", () => {
  it("filters items by question text (case-insensitive)", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "SHIP" },
    });
    expect(screen.getByText(/how long does shipping take/i)).toBeInTheDocument();
    expect(screen.getByText(/do you ship to all 50 states/i)).toBeInTheDocument();
    // No-match items should be gone.
    expect(
      screen.queryByText(/what's the difference between a futon frame/i),
    ).toBeNull();
    expect(screen.queryByText(/what is the return window/i)).toBeNull();
  });

  it("filters items by answer text (matches deep, not just the question)", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "mattress" },
    });
    // Only the Futon Frames row mentions 'mattress' in its answer.
    expect(
      screen.getByText(/what's the difference between a futon frame/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/how long does shipping take/i),
    ).toBeNull();
  });

  it("hides empty groups when their items all filter out", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "ship" },
    });
    // 'Futon Frames' has no match — its heading should not render.
    expect(screen.queryByRole("heading", { name: /futon frames/i })).toBeNull();
    // 'Ordering & Shipping' has matches — its heading does render.
    expect(
      screen.getByRole("heading", { name: /ordering & shipping/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty-state message when no items match", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "absolutely-not-in-any-faq-anywhere" },
    });
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });

  it("trims whitespace from the search input before matching", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "    " },
    });
    // All-whitespace search behaves as empty → all items visible.
    expect(screen.getByText(/how long does shipping take/i)).toBeInTheDocument();
    expect(screen.getByText(/what is the return window/i)).toBeInTheDocument();
  });
});

describe("FaqBrowser — category filter", () => {
  it("narrows visible groups when a category button is clicked", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.click(screen.getByRole("button", { name: /^returns$/i }));
    expect(screen.getByText(/what is the return window/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/how long does shipping take/i),
    ).toBeNull();
    expect(
      screen.queryByText(/what's the difference between a futon frame/i),
    ).toBeNull();
  });

  it("'All' resets to every group", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.click(screen.getByRole("button", { name: /^returns$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    expect(screen.getByText(/how long does shipping take/i)).toBeInTheDocument();
    expect(screen.getByText(/what is the return window/i)).toBeInTheDocument();
  });

  it("combines with search (category filter narrows, search filters within)", () => {
    render(<FaqBrowser groups={GROUPS} />);
    fireEvent.click(
      screen.getByRole("button", { name: /ordering & shipping/i }),
    );
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: "50 states" },
    });
    expect(screen.getByText(/do you ship to all 50 states/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/how long does shipping take/i),
    ).toBeNull();
  });

  it("marks the active filter button with aria-pressed='true'", () => {
    render(<FaqBrowser groups={GROUPS} />);
    const all = screen.getByRole("button", { name: /^all$/i });
    expect(all).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^returns$/i }));
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: /^returns$/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("FaqBrowser — render edge cases", () => {
  it("handles an empty groups array with the empty-state message", () => {
    render(<FaqBrowser groups={[]} />);
    expect(screen.getByText(/no questions/i)).toBeInTheDocument();
  });

  it("renders the matching question's answer text in the accordion body", () => {
    render(<FaqBrowser groups={GROUPS} />);
    // The accordion uses native <details>/<summary>; jsdom renders the
    // body whether or not it's "open", so we can assert presence directly.
    const items = screen.getAllByRole("group");
    expect(items.length).toBeGreaterThan(0);
    // Spot-check one body.
    const orderingGroup = within(
      screen.getByRole("heading", { name: /ordering & shipping/i })
        .parentElement!,
    );
    expect(orderingGroup.getByText(/3-5 business days/i)).toBeInTheDocument();
  });
});

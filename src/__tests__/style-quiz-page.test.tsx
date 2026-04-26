import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const quizMocks = vi.hoisted(() => ({
  getQuizOptions: vi.fn(),
}));

vi.mock("@/lib/wix/style-quiz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wix/style-quiz")>(
    "@/lib/wix/style-quiz",
  );
  return { ...actual, getQuizOptions: quizMocks.getQuizOptions };
});

// StyleQuiz is a client component. Stub it to verify the page wires it up.
vi.mock("@/components/quiz/StyleQuiz", () => ({
  StyleQuiz: ({ initialOptions }: { initialOptions: unknown }) => (
    <div
      data-testid="style-quiz"
      data-has-options={initialOptions !== null ? "true" : "false"}
    >
      Style Quiz
    </div>
  ),
}));

const MOCK_OPTIONS = {
  roomTypes: [{ value: "living-room", label: "Living Room" }],
  primaryUses: [{ value: "sitting", label: "Primarily Sitting" }],
  stylePreferences: [{ value: "modern", label: "Modern / Contemporary" }],
  sizeOptions: [{ value: "full", label: "Full" }],
  budgetRanges: [{ value: "500-1000", label: "$500 - $1,000" }],
};

beforeEach(() => {
  quizMocks.getQuizOptions.mockReset();
});

async function renderPage() {
  const { default: Page } = await import("@/app/style-quiz/page");
  const ui = await Page();
  return render(ui);
}

describe("StyleQuizPage", () => {
  it("renders the StyleQuiz component", async () => {
    quizMocks.getQuizOptions.mockResolvedValueOnce(MOCK_OPTIONS);
    await renderPage();
    expect(screen.getByTestId("style-quiz")).toBeInTheDocument();
  });

  it("passes options to StyleQuiz when fetch succeeds", async () => {
    quizMocks.getQuizOptions.mockResolvedValueOnce(MOCK_OPTIONS);
    await renderPage();
    expect(screen.getByTestId("style-quiz")).toHaveAttribute(
      "data-has-options",
      "true",
    );
  });

  it("passes null to StyleQuiz when options fetch fails", async () => {
    quizMocks.getQuizOptions.mockResolvedValueOnce(null);
    await renderPage();
    expect(screen.getByTestId("style-quiz")).toHaveAttribute(
      "data-has-options",
      "false",
    );
  });

  it("calls getQuizOptions exactly once on render", async () => {
    quizMocks.getQuizOptions.mockResolvedValueOnce(MOCK_OPTIONS);
    await renderPage();
    expect(quizMocks.getQuizOptions).toHaveBeenCalledTimes(1);
  });
});

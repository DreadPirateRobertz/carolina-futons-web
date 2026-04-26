import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StyleQuiz } from "@/components/quiz/StyleQuiz";

const quizMocks = vi.hoisted(() => ({
  getQuizRecommendations: vi.fn(),
  captureQuizLead: vi.fn(),
  getPersonalizedCopy: vi.fn(),
}));

const eventMocks = vi.hoisted(() => ({
  trackCustomEvent: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/wix/style-quiz", () => ({
  getQuizRecommendations: quizMocks.getQuizRecommendations,
  captureQuizLead: quizMocks.captureQuizLead,
  getPersonalizedCopy: quizMocks.getPersonalizedCopy,
}));

vi.mock("@/lib/wix/custom-events", () => ({
  trackCustomEvent: eventMocks.trackCustomEvent,
}));

const MOCK_OPTIONS = {
  roomTypes: [
    { value: "living-room", label: "Living Room" },
    { value: "dorm", label: "Dorm" },
  ],
  primaryUses: [{ value: "sitting", label: "Primarily Sitting" }],
  stylePreferences: [{ value: "modern", label: "Modern" }],
  sizeOptions: [{ value: "full", label: "Full" }],
  budgetRanges: [{ value: "500-1000", label: "$500 - $1,000" }],
};

const MOCK_RECS = [
  {
    product: {
      _id: "p1",
      name: "Mesa 1000",
      slug: "mesa-1000",
      price: 599,
      formattedPrice: "$599",
    },
    score: 80,
    reason: "Perfect for living rooms",
  },
];

beforeEach(() => {
  quizMocks.getQuizRecommendations.mockReset();
  quizMocks.captureQuizLead.mockReset();
  quizMocks.getPersonalizedCopy.mockReset();
  eventMocks.trackCustomEvent.mockReset();
  eventMocks.trackCustomEvent.mockResolvedValue({ success: true });
});

describe("StyleQuiz — null options", () => {
  it("shows fallback when options are null", () => {
    render(<StyleQuiz initialOptions={null} />);
    expect(
      screen.getByText(/quiz is temporarily unavailable/i),
    ).toBeInTheDocument();
  });
});

describe("StyleQuiz — step progression", () => {
  it("renders Q1 (roomType) on initial render", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    expect(
      screen.getByRole("heading", { name: /where will your futon live/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument();
  });

  it("fires quiz_started on first option selection", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    expect(eventMocks.trackCustomEvent).toHaveBeenCalledWith("quiz_started", {
      source: "style_quiz",
    });
  });

  it("advances to Q2 after selecting a room type", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    expect(
      screen.getByRole("heading", { name: /how will you use it most/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Question 2 of 5/)).toBeInTheDocument();
  });

  it("does not fire quiz_started twice on second selection", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    fireEvent.click(screen.getByRole("button", { name: /primarily sitting/i }));
    const calls = eventMocks.trackCustomEvent.mock.calls.filter(
      (args) => args[0] === "quiz_started",
    );
    expect(calls).toHaveLength(1);
  });

  it("shows back button from Q2 onward", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("goes back to Q1 when Back is clicked on Q2", () => {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(
      screen.getByRole("heading", { name: /where will your futon live/i }),
    ).toBeInTheDocument();
  });
});

describe("StyleQuiz — email gate", () => {
  function advanceToEmailGate() {
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    fireEvent.click(screen.getByRole("button", { name: /primarily sitting/i }));
    fireEvent.click(screen.getByRole("button", { name: /modern/i }));
  }

  it("shows email gate after Q3 (stylePreference)", () => {
    advanceToEmailGate();
    expect(
      screen.getByRole("heading", { name: /want your results saved/i }),
    ).toBeInTheDocument();
  });

  it("shows empty-email error when submitting with no email", async () => {
    advanceToEmailGate();
    fireEvent.submit(
      screen.getByRole("button", { name: /^continue/i }).closest("form")!,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/enter your email/i);
    });
  });

  it("shows format error for invalid email", async () => {
    advanceToEmailGate();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "notanemail" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /^continue/i }).closest("form")!,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    });
  });

  it("advances to Q4 when skipping email", () => {
    advanceToEmailGate();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(
      screen.getByRole("heading", { name: /what size do you need/i }),
    ).toBeInTheDocument();
  });

  it("fires quiz_lead_captured and advances on successful email submit", async () => {
    quizMocks.captureQuizLead.mockResolvedValueOnce({ success: true });
    advanceToEmailGate();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /^continue/i }).closest("form")!,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /what size do you need/i }),
      ).toBeInTheDocument();
    });
    expect(eventMocks.trackCustomEvent).toHaveBeenCalledWith(
      "quiz_lead_captured",
      { source: "style_quiz" },
    );
  });
});

describe("StyleQuiz — results", () => {
  async function advanceToResults() {
    quizMocks.getQuizRecommendations.mockResolvedValue(MOCK_RECS);
    quizMocks.getPersonalizedCopy.mockResolvedValue({
      copy: "Great for small spaces",
      profileType: "compact",
    });
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    fireEvent.click(screen.getByRole("button", { name: /primarily sitting/i }));
    fireEvent.click(screen.getByRole("button", { name: /modern/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.click(screen.getByRole("button", { name: /full/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$500 - \$1,000/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/your perfect futon matches/i),
      ).toBeInTheDocument();
    });
  }

  it("fires quiz_completed when completing the last question", async () => {
    await advanceToResults();
    expect(eventMocks.trackCustomEvent).toHaveBeenCalledWith(
      "quiz_completed",
      expect.objectContaining({ source: "style_quiz" }),
    );
  });

  it("shows the recommendation name in results", async () => {
    await advanceToResults();
    expect(screen.getByText("Mesa 1000")).toBeInTheDocument();
  });

  it("shows personalized copy in results", async () => {
    await advanceToResults();
    expect(screen.getByText("Great for small spaces")).toBeInTheDocument();
  });

  it("shows empty-state when no recs returned", async () => {
    quizMocks.getQuizRecommendations.mockResolvedValue([]);
    quizMocks.getPersonalizedCopy.mockResolvedValue({
      copy: "",
      profileType: "style",
    });
    render(<StyleQuiz initialOptions={MOCK_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: /living room/i }));
    fireEvent.click(screen.getByRole("button", { name: /primarily sitting/i }));
    fireEvent.click(screen.getByRole("button", { name: /modern/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.click(screen.getByRole("button", { name: /full/i }));
    fireEvent.click(screen.getByRole("button", { name: /\$500 - \$1,000/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/could not find an exact match/i),
      ).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const reactDomMocks = vi.hoisted(() => ({
  useFormStatus: vi.fn<() => { pending: boolean }>(() => ({ pending: false })),
}));

const reactMocks = vi.hoisted(() => {
  type Action = (prev: unknown, formData: FormData) => unknown | Promise<unknown>;
  return {
    state: { status: "idle" } as unknown,
    useActionState: vi.fn(
      (action: Action, _initial: unknown) =>
        [reactMocks.state, action, false] as const,
    ),
  };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: reactMocks.useActionState };
});

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return { ...actual, useFormStatus: reactDomMocks.useFormStatus };
});

vi.mock("@/app/actions/survey", () => ({
  submitSurvey: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/survey/survey-state", () => ({
  initialSurveyActionState: { status: "idle" },
}));

import { SurveyForm } from "@/components/survey/SurveyForm";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("SurveyForm — idle state", () => {
  it("renders NPS score buttons 0–10", () => {
    render(<SurveyForm />);
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByRole("radio", { name: String(i) })).toBeInTheDocument();
    }
  });

  it("renders the comments textarea", () => {
    render(<SurveyForm />);
    expect(
      screen.getByRole("textbox", { name: /main reason/i }),
    ).toBeInTheDocument();
  });

  it("renders Submit button enabled when idle", () => {
    render(<SurveyForm />);
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn).not.toBeDisabled();
  });

  it("renders orderId as hidden input when provided", () => {
    const { container } = render(<SurveyForm orderId="ORD-123" />);
    const hidden = container.querySelector('input[name="orderId"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("ORD-123");
  });
});

describe("SurveyForm — pending state", () => {
  it("disables Submit button and shows Submitting… while pending", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<SurveyForm />);
    const btn = screen.getByRole("button", { name: /submitting/i });
    expect(btn).toBeDisabled();
  });
});

describe("SurveyForm — error state", () => {
  it("renders the error message", () => {
    reactMocks.state = { status: "error", error: "Please choose a score from 0 to 10." };
    render(<SurveyForm />);
    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/please choose a score/i);
  });
});

describe("SurveyForm — success state", () => {
  it("renders the thank-you message and hides the form", () => {
    reactMocks.state = { status: "success" };
    render(<SurveyForm />);
    expect(screen.getByTestId("survey-success")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

// cfw-921: CustomerQaForm vitest tests.
// Covers idle render, success state, field-error state, transport-error state.
// Uses vi.hoisted() to mock useActionState + useFormStatus before any import
// (same pattern as ContactForm.test.tsx).

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

vi.mock("@/app/products/[slug]/qa-actions", () => ({
  submitQuestion: vi.fn(async () => ({ status: "idle" })),
}));

vi.mock("@/components/product/qa-state", () => ({
  initialQaState: { status: "idle" },
}));

import { CustomerQaForm } from "@/components/product/CustomerQaForm";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("CustomerQaForm — idle state", () => {
  it("renders the question textarea with accessible label", () => {
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByLabelText(/your question/i)).toBeInTheDocument();
  });

  it("renders the optional name field", () => {
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("renders the submit button enabled", () => {
    render(<CustomerQaForm productSlug="test-futon" />);
    const btn = screen.getByRole("button", { name: /submit question/i });
    expect(btn).toBeEnabled();
  });

  it("renders the form with accessible label", () => {
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByRole("form", { name: /ask a question/i })).toBeInTheDocument();
  });
});

describe("CustomerQaForm — success state", () => {
  it("renders thank-you message instead of form", () => {
    reactMocks.state = { status: "success" };
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByTestId("qa-success")).toBeInTheDocument();
    expect(screen.getByText(/thanks — your question has been submitted/i)).toBeInTheDocument();
  });

  it("does not render the form fields after success", () => {
    reactMocks.state = { status: "success" };
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.queryByLabelText(/your question/i)).not.toBeInTheDocument();
  });
});

describe("CustomerQaForm — field error state", () => {
  it("renders question error message with role=alert", () => {
    reactMocks.state = {
      status: "error",
      errors: { question: "Question is required" },
      values: { question: "", name: undefined },
    };
    render(<CustomerQaForm productSlug="test-futon" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/question is required/i);
  });

  it("marks question textarea as aria-invalid on error", () => {
    reactMocks.state = {
      status: "error",
      errors: { question: "Question is required" },
      values: { question: "", name: undefined },
    };
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByLabelText(/your question/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("repopulates question value from error state values", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      values: { question: "Does it fold easily?", name: "Jane" },
    };
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByLabelText(/your question/i)).toHaveValue("Does it fold easily?");
  });
});

describe("CustomerQaForm — transport error state", () => {
  it("renders transport error alert when transportError is set", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      values: { question: "Is it sturdy?", name: undefined },
      transportError: "We couldn't save that — please try again.",
    };
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save that/i);
  });

  it("does not render transport error alert in idle state", () => {
    render(<CustomerQaForm productSlug="test-futon" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("CustomerQaForm — submit button pending state", () => {
  it("disables button and shows 'Submitting…' when pending", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<CustomerQaForm productSlug="test-futon" />);
    const btn = screen.getByRole("button", { name: /submitting/i });
    expect(btn).toBeDisabled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-contact-form: the form is a thin client wrapper over the Server Action
// in `src/app/contact/actions.ts`. These tests drive the *rendering* side
// (labels, error/success states, value echo) via a controllable mock of
// `useActionState`. The action's behavior (validation + nodemailer) is
// covered separately in contact-actions.test.ts.

const reactDomMocks = vi.hoisted(() => ({
  useFormStatus: vi.fn<() => { pending: boolean }>(() => ({ pending: false })),
}));

const reactMocks = vi.hoisted(() => {
  type Action = (
    prev: unknown,
    formData: FormData,
  ) => unknown | Promise<unknown>;
  return {
    // Seed the state the form will render. Tests reset this per-case.
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

// The action itself is irrelevant to these tests — the form just binds it.
vi.mock("@/app/contact/actions", () => ({
  sendContactForm: vi.fn(async () => ({ status: "idle" })),
  initialContactActionState: { status: "idle" },
}));

import { ContactForm } from "@/components/contact/ContactForm";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("ContactForm — rendering", () => {
  it("renders all required fields with accessible labels", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^subject$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("binds the Server Action on the <form action> prop", () => {
    render(<ContactForm />);
    const form = screen.getByRole("form", { name: /contact form/i });
    // JSX `action={fn}` ends up on the DOM attribute as the function's
    // serialized representation; just verify the form is wired, not idle.
    expect(form).toBeInTheDocument();
  });
});

describe("ContactForm — error state", () => {
  it("renders per-field error messages and aria-invalid when state is error", () => {
    reactMocks.state = {
      status: "error",
      errors: {
        name: "Please tell us your name.",
        email: "That email doesn't look right.",
      },
      values: {
        name: "",
        email: "bad",
        subject: "hi",
        message: "hi there this is a test",
      },
    };
    render(<ContactForm />);
    expect(screen.getByText(/please tell us your name/i)).toBeInTheDocument();
    expect(screen.getByText(/that email doesn't look right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("echoes back submitted values via defaultValue so the user doesn't retype", () => {
    reactMocks.state = {
      status: "error",
      errors: { message: "Please include a message." },
      values: {
        name: "Jane",
        email: "jane@example.com",
        phone: "",
        subject: "Subject here",
        message: "",
      },
    };
    render(<ContactForm />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Jane");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("jane@example.com");
    expect(screen.getByLabelText(/^subject$/i)).toHaveValue("Subject here");
  });

  it("renders a top-level alert when transportError is set", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      transportError: "We couldn't send that — please try again in a moment.",
      values: {
        name: "J",
        email: "j@example.com",
        subject: "s",
        message: "message body long enough",
      },
    };
    render(<ContactForm />);
    expect(screen.getByText(/couldn't send that/i)).toBeInTheDocument();
  });
});

describe("ContactForm — success state", () => {
  it("renders the success panel and replaces the form", () => {
    reactMocks.state = { status: "success" };
    render(<ContactForm />);
    expect(screen.getByTestId("contact-success")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
  });
});

describe("ContactForm — pending state", () => {
  it("disables the submit button and shows 'Sending…' while pending", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<ContactForm />);
    const button = screen.getByRole("button", { name: /sending/i });
    expect(button).toBeDisabled();
  });
});

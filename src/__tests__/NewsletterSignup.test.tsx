import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-newsletter-footer: render-layer tests for the footer signup form.
// The action itself (validation + persistence) is covered by
// newsletter-actions.test.ts — here we just verify the form binds the
// action, renders error/success state, and shows pending UI on submit.

const reactDomMocks = vi.hoisted(() => ({
  useFormStatus: vi.fn<() => { pending: boolean }>(() => ({ pending: false })),
}));

const reactMocks = vi.hoisted(() => {
  type Action = (
    prev: unknown,
    formData: FormData,
  ) => unknown | Promise<unknown>;
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

vi.mock("@/app/newsletter/actions", () => ({
  subscribeToNewsletter: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/newsletter/newsletter-state", () => ({
  initialNewsletterActionState: { status: "idle" },
}));

import { NewsletterSignup } from "@/components/site/NewsletterSignup";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("NewsletterSignup — rendering", () => {
  it("renders an email input with an accessible label + CTA", () => {
    render(<NewsletterSignup />);
    expect(screen.getByLabelText(/stay in the loop/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeInTheDocument();
  });

  it("uses the Server Action on the <form action> prop", () => {
    render(<NewsletterSignup />);
    expect(screen.getByRole("form", { name: /newsletter signup/i })).toBeInTheDocument();
  });
});

describe("NewsletterSignup — error state", () => {
  it("shows the field error and aria-invalid when state is error", () => {
    reactMocks.state = {
      status: "error",
      errors: { email: "That email doesn't look right." },
    };
    render(<NewsletterSignup />);
    expect(
      screen.getByText(/that email doesn't look right/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/stay in the loop/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a storeError alert when the persistence layer fails", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      storeError: "We couldn't save that right now — please try again shortly.",
    };
    render(<NewsletterSignup />);
    expect(
      screen.getByText(/couldn't save that right now/i),
    ).toBeInTheDocument();
  });
});

describe("NewsletterSignup — success state", () => {
  it("renders the NEW subscriber thank-you when alreadySubscribed=false", () => {
    reactMocks.state = { status: "success", alreadySubscribed: false };
    render(<NewsletterSignup />);
    expect(screen.getByTestId("newsletter-success")).toHaveTextContent(
      /you're on the list/i,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("renders the already-subscribed message when alreadySubscribed=true", () => {
    reactMocks.state = { status: "success", alreadySubscribed: true };
    render(<NewsletterSignup />);
    expect(screen.getByTestId("newsletter-success")).toHaveTextContent(
      /already on the list/i,
    );
  });
});

describe("NewsletterSignup — pending state", () => {
  it("disables the submit button and shows 'Subscribing…' while pending", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<NewsletterSignup />);
    const button = screen.getByRole("button", { name: /subscribing/i });
    expect(button).toBeDisabled();
  });
});

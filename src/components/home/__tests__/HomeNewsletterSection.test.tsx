import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Render-layer tests for the home-page inline newsletter section.
// The server action + store logic are covered by newsletter-actions.test.ts
// and newsletter-store.test.ts. Here we verify form structure, error state,
// success state, and pending UI — the same contract as NewsletterSignup.test.tsx.

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

vi.mock("@/app/newsletter/actions", () => ({
  subscribeToNewsletter: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/newsletter/newsletter-state", () => ({
  initialNewsletterActionState: { status: "idle" },
}));

import { HomeNewsletterSection } from "@/components/home/HomeNewsletterSection";

beforeEach(() => {
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
});

describe("HomeNewsletterSection — rendering", () => {
  it("renders the section heading", () => {
    render(<HomeNewsletterSection />);
    expect(
      screen.getByRole("heading", { name: /stay in the loop/i }),
    ).toBeInTheDocument();
  });

  it("renders an email input and subscribe button", () => {
    render(<HomeNewsletterSection />);
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeInTheDocument();
  });

  it("form has accessible aria-label", () => {
    render(<HomeNewsletterSection />);
    expect(
      screen.getByRole("form", { name: /newsletter signup/i }),
    ).toBeInTheDocument();
  });
});

describe("HomeNewsletterSection — error state", () => {
  it("shows a field error and aria-invalid when email is invalid", () => {
    reactMocks.state = {
      status: "error",
      errors: { email: "That email doesn't look right." },
    };
    render(<HomeNewsletterSection />);
    expect(
      screen.getByText(/that email doesn't look right/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a storeError alert when persistence fails", () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      storeError: "We couldn't save that right now — please try again shortly.",
    };
    render(<HomeNewsletterSection />);
    expect(screen.getByText(/couldn't save that right now/i)).toBeInTheDocument();
  });
});

describe("HomeNewsletterSection — success state", () => {
  it("shows the new-subscriber thank-you and hides the form", () => {
    reactMocks.state = { status: "success", alreadySubscribed: false };
    render(<HomeNewsletterSection />);
    expect(screen.getByTestId("home-newsletter-success")).toHaveTextContent(
      /you're on the list/i,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("shows already-subscribed message when alreadySubscribed=true", () => {
    reactMocks.state = { status: "success", alreadySubscribed: true };
    render(<HomeNewsletterSection />);
    expect(screen.getByTestId("home-newsletter-success")).toHaveTextContent(
      /already on the list/i,
    );
  });
});

describe("HomeNewsletterSection — pending state", () => {
  it("disables the submit button and shows 'Subscribing…'", () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<HomeNewsletterSection />);
    expect(screen.getByRole("button", { name: /subscribing/i })).toBeDisabled();
  });
});

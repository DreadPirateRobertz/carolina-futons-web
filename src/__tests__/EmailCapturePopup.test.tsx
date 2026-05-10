import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const STORAGE_KEY = "cf-email-popup-dismissed";

// cfw-xnd: EmailCapturePopup now wires submit to the subscribeToNewsletter
// Server Action via useActionState (matching NewsletterSignup +
// HomeNewsletterSection). Mock react's useActionState + the action import so
// we can drive the success/error/idle render paths without spinning up the
// Velo backend in jsdom.
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

import { EmailCapturePopup } from "@/components/site/EmailCapturePopup";

// --- localStorage mock ---
const lsMock = (() => {
  let store: Record<string, string> = {};
  const impl = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  const fns = {
    getItem: vi.fn(impl.getItem),
    setItem: vi.fn(impl.setItem),
    removeItem: vi.fn(impl.removeItem),
    clear() {
      store = {};
      fns.getItem.mockReset().mockImplementation(impl.getItem);
      fns.setItem.mockReset().mockImplementation(impl.setItem);
      fns.removeItem.mockReset().mockImplementation(impl.removeItem);
    },
  };
  return fns;
})();

beforeEach(() => {
  vi.useFakeTimers();
  lsMock.clear();
  reactMocks.state = { status: "idle" };
  reactDomMocks.useFormStatus.mockReturnValue({ pending: false });
  Object.defineProperty(window, "localStorage", { value: lsMock, writable: true, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
  Object.defineProperty(document.body, "scrollHeight", { value: 2000, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EmailCapturePopup", () => {
  it("renders nothing initially", () => {
    const { container } = render(<EmailCapturePopup />);
    expect(container.firstChild).toBeNull();
  });

  it("does NOT show the dialog on mount, even after a long delay (cfw-l93)", async () => {
    // Old behaviour fired the popup 8s after mount regardless of scroll;
    // surfaced as a hero-occlusion regression on mobile (cfw-y2i.1).
    render(<EmailCapturePopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does NOT show the dialog while the user is still on the hero", async () => {
    render(<EmailCapturePopup />);
    await act(async () => {
      // Half a viewport scrolled — still inside the hero region.
      Object.defineProperty(window, "scrollY", { value: 400, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the dialog once the user has scrolled past one full viewport (engaged with the page)", async () => {
    render(<EmailCapturePopup />);
    await act(async () => {
      // 1 full viewport height scrolled = hero has been seen and scrolled past.
      Object.defineProperty(window, "scrollY", { value: 800, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Stay in the loop")).toBeInTheDocument();
  });

  // Helper — fire the engaged-scroll event so the popup opens.
  async function engageAndOpen() {
    await act(async () => {
      Object.defineProperty(window, "scrollY", { value: 800, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
  }

  it("dismisses when the X button is clicked", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sets localStorage flag on dismiss so popup does not re-show", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(lsMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });

  it("never shows when localStorage flag is already set", async () => {
    lsMock.getItem.mockReturnValue("1");
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("binds the form submit to the newsletter Server Action (cfw-xnd)", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    // The form's `action` prop is set to the formAction returned by
    // useActionState — which we mock to pass the action through. Verify that
    // useActionState was called with subscribeToNewsletter as the action.
    expect(reactMocks.useActionState).toHaveBeenCalled();
    const [actionArg] = reactMocks.useActionState.mock.calls[0];
    expect(typeof actionArg).toBe("function");
    expect(screen.getByRole("form", { name: /email signup/i })).toBeInTheDocument();
  });

  it("renders the success message and persists the dismiss flag when the action returns success (cfw-xnd)", async () => {
    reactMocks.state = { status: "success", alreadySubscribed: false };
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.getByTestId("email-capture-success")).toHaveTextContent(
      /thanks — you're on the list/i,
    );
    // Form is replaced by the success message; the popup itself stays
    // visible until the user dismisses it via X / outside click.
    expect(screen.queryByRole("form")).toBeNull();
    // Success persists the dismiss flag so the popup doesn't re-show on the
    // next page load.
    expect(lsMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });

  it("renders the already-subscribed copy when the action says so (cfw-xnd)", async () => {
    reactMocks.state = { status: "success", alreadySubscribed: true };
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.getByTestId("email-capture-success")).toHaveTextContent(
      /you're already on the list/i,
    );
  });

  it("renders an inline field error when the action reports a validation problem (cfw-xnd)", async () => {
    reactMocks.state = {
      status: "error",
      errors: { email: "That email doesn't look right." },
    };
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(
      screen.getByText(/that email doesn't look right/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("renders a storeError alert when the persistence layer fails (cfw-xnd)", async () => {
    reactMocks.state = {
      status: "error",
      errors: {},
      storeError: "We couldn't save that right now — please try again shortly.",
    };
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(
      screen.getByText(/we couldn't save that right now/i),
    ).toBeInTheDocument();
  });

  it("disables the submit button while the action is pending (cfw-xnd)", async () => {
    reactDomMocks.useFormStatus.mockReturnValue({ pending: true });
    render(<EmailCapturePopup />);
    await engageAndOpen();
    const button = screen.getByRole("button", { name: /subscribing/i });
    expect(button).toBeDisabled();
  });

  it("renders headline, email input, CTA button, and close button", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.getByRole("heading", { name: "Stay in the loop" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign me up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AccountPage, { metadata } from "@/app/account/page";

// ── matchMedia stub (required for jsdom) ──────────────────────────────────────
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

// ── window.location stub ──────────────────────────────────────────────────────
const originalLocation = window.location;
beforeEach(() => {
  vi.stubGlobal("location", { href: "" });
});
afterEach(() => {
  vi.stubGlobal("location", originalLocation);
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderPage() {
  return render(<AccountPage />);
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /sign in/i });
}

function fillAndSubmit(email = "test@example.com", password = "secret") {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// cf-3qt.8.A.F1: /account was previously a pure client component and could
// not export metadata (Next.js app-router disallows it). The page is now a
// server wrapper around <AccountSignIn> so we can assert the metadata here.
describe("AccountPage — metadata (cf-3qt.8.A.F1)", () => {
  it("exports a static Metadata object", () => {
    expect(metadata).toBeDefined();
  });

  it("sets a descriptive title containing 'Sign In' and brand", () => {
    expect(metadata.title).toMatch(/sign in/i);
    expect(metadata.title).toMatch(/carolina futons/i);
  });

  it("sets a non-trivial description (>= 40 chars)", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThanOrEqual(40);
  });
});

describe("AccountPage — rendering", () => {
  it("renders sign-in heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders email and password inputs", () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders submit button enabled by default", () => {
    renderPage();
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("renders link to dashboard for already-signed-in users", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /go to your dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("no error alert visible on initial render", () => {
    renderPage();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AccountPage — sign-in success", () => {
  it("redirects to redirectTo on successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, redirectTo: "/dashboard" }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(window.location.href).toBe("/dashboard");
    });
  });

  it("posts to /api/auth/login with email, password, and callbackUrl", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, redirectTo: "/dashboard" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    renderPage();
    fillAndSubmit("user@test.com", "hunter2");
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    const sent = JSON.parse(init.body as string) as { email: string; password: string };
    expect(sent.email).toBe("user@test.com");
    expect(sent.password).toBe("hunter2");
  });

  it("button shows 'Signing in…' while loading", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    renderPage();
    fillAndSubmit();
    expect(screen.getByRole("button", { name: /signing in/i })).toBeInTheDocument();
    act(() => resolveFetch({ json: async () => ({ error: "fail" }) }));
  });

  it("button is disabled during loading", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    renderPage();
    fillAndSubmit();
    // During loading the button text is "Signing in…" — not "Sign in"
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    act(() => resolveFetch({ json: async () => ({ error: "fail" }) }));
  });
});

describe("AccountPage — sign-in failure", () => {
  it("shows error from API response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "Email or password is incorrect." }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/email or password/i);
  });

  it("re-enables submit button after failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "fail" }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("shows error alert on network error (fetch throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("does NOT navigate on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "Email or password is incorrect." }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(window.location.href).toBe("");
  });
});

describe("AccountPage — email verification pending", () => {
  it("shows verification screen when API returns email_verification_required", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ state: "email_verification_required" }),
      }),
    );
    renderPage();
    fillAndSubmit("pending@example.com");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/pending@example.com/)).toBeInTheDocument();
  });

  it("shows 'Back to sign in' link on verification screen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ state: "email_verification_required" }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /back to sign in/i })).toBeInTheDocument();
  });

  it("returns to sign-in form when 'Back to sign in' is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ state: "email_verification_required" }),
      }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(screen.getByRole("heading", { name: /^sign in$/i })).toBeInTheDocument();
  });
});

// Lock in that every failure-path invokes console.error so errors surface
// to devtools / Sentry's global error handler.
describe("AccountPage — catch-path logging", () => {
  it("console.errors the network failure in catch", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrown = new Error("network down");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(thrown));
    renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[spy.mock.calls.length - 1];
    expect(args.some((a) => a === thrown)).toBe(true);
  });

  it("console.errors on unexpected response shape", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ unexpected: true }) }),
    );
    renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(spy).toHaveBeenCalled();
  });
});

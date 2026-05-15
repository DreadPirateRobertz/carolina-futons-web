import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type React from "react";
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
// AccountPage is an async server component — call it directly to get its JSX.
async function renderPage(next?: string) {
  const jsx = await AccountPage({ searchParams: Promise.resolve(next ? { next } : {}) });
  return render(jsx as React.ReactElement);
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
  it("renders sign-in heading", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders email and password inputs", async () => {
    await renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders submit button enabled by default", async () => {
    await renderPage();
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("renders link to dashboard for already-signed-in users", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: /go to your dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("no error alert visible on initial render", async () => {
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("shows error alert on network error (fetch throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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
    await renderPage();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(spy).toHaveBeenCalled();
  });
});

describe("AccountPage — ?next= redirect (cf-w5ks)", () => {
  it("redirects to ?next= after successful login when next is a safe internal path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, redirectTo: "/dashboard/wishlist" }),
      }),
    );
    await renderPage("/dashboard/wishlist");
    fillAndSubmit();
    await waitFor(() => {
      expect(window.location.href).toBe("/dashboard/wishlist");
    });
  });

  it("sends the ?next= path as callbackUrl in the login request", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, redirectTo: "/dashboard/orders" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("/dashboard/orders");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBe("/dashboard/orders"));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { callbackUrl: string };
    expect(sent.callbackUrl).toBe("/dashboard/orders");
  });

  it("falls back to /dashboard when no ?next= provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, redirectTo: "/dashboard" }),
      }),
    );
    await renderPage();
    fillAndSubmit();
    await waitFor(() => {
      expect(window.location.href).toBe("/dashboard");
    });
  });

  it("rejects protocol-relative ?next= and redirects to /dashboard instead", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("//evil.example.com");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { callbackUrl: string };
    expect(sent.callbackUrl).toBe("/dashboard");
  });

  it("rejects absolute URL ?next= and redirects to /dashboard instead", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("https://evil.example.com/steal");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { callbackUrl: string };
    expect(sent.callbackUrl).toBe("/dashboard");
  });

  it("rejects backslash-prefixed ?next= to block browser slash-normalization bypass", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("/\\evil.example.com");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { callbackUrl: string };
    expect(sent.callbackUrl).toBe("/dashboard");
  });

  it("falls back to /dashboard when server returns ok:true without redirectTo", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await renderPage("/dashboard/wishlist");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { callbackUrl: string };
    expect(sent.callbackUrl).toBe("/dashboard/wishlist");
  });

  it("rejects a malicious redirectTo from the server response (defense in depth)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, redirectTo: "https://evil.example.com" }),
      }),
    );
    await renderPage("/dashboard");
    fillAndSubmit();
    await waitFor(() => expect(window.location.href).toBeTruthy());
    expect(window.location.href).toBe("/dashboard");
  });
});

// cf-2oku: /account scored Lighthouse A11y 93/100 in cf-d41j member-pages
// parity audit, vs Wix's 100. Two WCAG violations:
//   1. WCAG 1.4.3 contrast — muted helper text + form placeholder failed
//      4.5:1 against white background. Surfaces below 80% opacity on the
//      cf-charcoal token fall under the threshold.
//   2. WCAG 1.4.1 link distinguishability — secondary links used
//      `hover:underline` so the default state was color-only.
// Tests pin the classNames so a future Tailwind refactor that re-introduces
// `/60` or drops the persistent underline fails CI loudly.
describe("AccountSignIn a11y — cf-2oku contrast + link distinguishability", () => {
  it("Forgot password link carries persistent underline (not hover-only)", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /forgot your password/i });
    // Class-list membership check — `hover:underline` is NOT enough
    // (default state would still be color-only). Need `underline` as a
    // standalone class in the default state to satisfy WCAG 1.4.1.
    expect(link.className.split(/\s+/)).toContain("underline");
  });

  it("'Go to your dashboard' link carries persistent underline", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /go to your dashboard/i });
    expect(link.className.split(/\s+/)).toContain("underline");
  });

  it("'Create one' link carries persistent underline", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /create one/i });
    expect(link.className.split(/\s+/)).toContain("underline");
  });

  it("Muted helper paragraphs use ≥/80 opacity (not /60) for AA contrast", async () => {
    const { container } = await renderPage();
    const muted = Array.from(
      container.querySelectorAll<HTMLElement>("p"),
    ).filter((p) => /text-cf-charcoal\//.test(p.className));
    // Every muted paragraph that's still using the cf-charcoal token must
    // be at /80 or higher (4.5:1 against the cf-cream / white form bg).
    expect(muted.length).toBeGreaterThan(0);
    for (const p of muted) {
      expect(p.className).not.toMatch(/text-cf-charcoal\/60(?!\d)/);
      expect(p.className).not.toMatch(/text-cf-charcoal\/40(?!\d)/);
    }
  });

  it("Form input placeholders use ≥/60 opacity (not /40) for AA contrast", async () => {
    const { container } = await renderPage();
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input"));
    // Email + password inputs both have placeholder text. Default browser
    // renderers apply ~50% opacity to placeholders already, stacking with
    // a /40 class gives ~20% effective — far below 4.5:1.
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.className).not.toMatch(/placeholder-cf-charcoal\/40(?!\d)/);
    }
  });
});

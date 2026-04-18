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

function getSignInButton() {
  return screen.getByRole("button", { name: /sign in with wix/i });
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

  it("renders sign-in button enabled by default", () => {
    renderPage();
    expect(getSignInButton()).not.toBeDisabled();
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
  it("redirects to authUrl on successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: "https://auth.wix.com/oauth" }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(window.location.href).toBe("https://auth.wix.com/oauth");
    });
  });

  it("button shows 'Redirecting…' while loading", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    expect(screen.getByRole("button", { name: /redirecting/i })).toBeInTheDocument();
    // resolve to avoid unhandled rejection
    act(() => resolveFetch({ ok: false, status: 500, json: async () => ({}) }));
  });

  it("button is disabled during loading", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    expect(screen.getByRole("button")).toBeDisabled();
    act(() => resolveFetch({ ok: false, status: 500, json: async () => ({}) }));
  });
});

describe("AccountPage — sign-in failure", () => {
  it("shows error alert on non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/try again/i);
  });

  it("re-enables button after fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
    });
  });

  it("shows error alert on network error (fetch throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows error alert when authUrl is missing from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: undefined }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("does NOT navigate when authUrl is empty string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: "" }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("does NOT navigate when authUrl is null (cf-3qt.8.A.F1 guard)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: null }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("does NOT navigate when authUrl is a non-string type (cf-3qt.8.A.F1 guard)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: 42 }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });
});

// cf-3qt.8.A.F1: every catch path must surface to devtools / Sentry. A bare
// catch that discards the error blocks Sentry's global handler; these tests
// lock in that every failure-path invokes console.error with the thrown value.
describe("AccountPage — catch-path logging (cf-3qt.8.A.F1)", () => {
  it("console.errors the network failure in catch", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrown = new Error("network down");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(thrown));
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[spy.mock.calls.length - 1];
    expect(args.some((a) => a === thrown)).toBe(true);
  });

  it("console.errors on non-ok HTTP response", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalled();
  });

  it("console.errors on invalid authUrl shape", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authUrl: null }),
      }),
    );
    renderPage();
    fireEvent.click(getSignInButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalled();
  });
});

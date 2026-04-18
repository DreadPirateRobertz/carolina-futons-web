import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AccountPage from "@/app/account/page";

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
});

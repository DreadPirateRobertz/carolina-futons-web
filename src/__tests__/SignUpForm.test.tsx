import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpForm } from "@/components/account/SignUpForm";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function fillForm(
  email = "new@example.com",
  password = "password123",
  confirm = "password123",
) {
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: confirm },
  });
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and three fields", () => {
    render(<SignUpForm />);
    expect(
      screen.getByRole("heading", { name: /create an account/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
  });

  it("has a link to /account for existing members", () => {
    render(<SignUpForm />);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link.getAttribute("href")).toBe("/account");
  });

  it("shows error when passwords do not match", async () => {
    render(<SignUpForm />);
    fillForm("a@b.com", "password123", "different");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/do not match/i);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error when password is too short", async () => {
    render(<SignUpForm />);
    fillForm("a@b.com", "short", "short");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/8 characters/i);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows verify-email screen on email_verification_required", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ state: "email_verification_required" }),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /check your email/i }),
      ).toBeTruthy();
    });
  });

  it("shows account-created + sign-in link on registered_sign_in_required", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ state: "registered_sign_in_required" }),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /account created/i }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe(
      "/account",
    );
  });

  it("redirects to /dashboard on success", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
    Object.defineProperty(window.location, "href", {
      set: assign,
      configurable: true,
    });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, redirectTo: "/dashboard" }),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows API error message", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        error: "An account with that email already exists.",
      }),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/already exists/i);
    });
  });

  it("shows generic error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/please try again/i);
    });
  });

  it("shows generic error when API returns empty body (unexpected_response path)", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({}),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/please try again/i);
    });
  });

  it("verify screen has a Back button that returns to the form", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ state: "email_verification_required" }),
    });
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /back to sign up/i }));
    expect(screen.getByRole("heading", { name: /create an account/i })).toBeTruthy();
  });

  it("disables button while loading", async () => {
    let resolve: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<SignUpForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      screen.getByRole("button", { name: /creating account/i }),
    ).toBeDisabled();
    resolve!({ json: async () => ({ error: "done" }) });
  });

  it("page metadata: /signup page renders SignUpForm", async () => {
    const { default: SignUpPage } = await import("@/app/signup/page");
    const { container } = render(<SignUpPage />);
    expect(
      container.querySelector("form"),
    ).not.toBeNull();
  });
});

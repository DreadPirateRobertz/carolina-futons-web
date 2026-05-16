import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// cfw-qeb6: submit-failure path routes through logError.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  mockLogError.mockReset();
});

describe("<ForgotPasswordForm />", () => {
  it("renders the email field, submit button, and back link", () => {
    render(<ForgotPasswordForm />);
    expect(
      screen.getByRole("heading", { name: /forgot your password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to sign in/i }),
    ).toHaveAttribute("href", "/account");
  });

  it("posts to /api/auth/forgot-password and shows confirmation on success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    expect(screen.getByText("user@example.com")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
  });

  it("shows the API error message when the request returns one", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Please enter a valid email address." }),
    });

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "bad");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    });
  });

  it("shows a generic error + ships logError when fetch throws (cfw-qeb6)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // cfw-qeb6: client-component failure path now routes through
    // logError. `void` semantics in the source — the form re-enables
    // and shows its error WITHOUT awaiting the Sentry flush.
    expect(mockLogError).toHaveBeenCalledWith(
      "ForgotPasswordForm",
      "submit",
      expect.any(Error),
    );
  });
});

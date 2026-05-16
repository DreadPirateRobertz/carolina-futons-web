import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// cfw-logger migration: form's catch routes through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  logErrorMock.mockReset();
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

  it("shows a generic error when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // Observability now routes through logError (cfw-logger migration).
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// cfw-logger migration: form's catch routes through
// logError("ForgotPasswordForm", "submit failed", err).
describe("<ForgotPasswordForm /> — logError observability", () => {
  it("calls logError when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalledTimes(1));
  });

  it("tags logError with scope='ForgotPasswordForm' and message='submit failed'", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalled());
    expect(logErrorMock).toHaveBeenCalledWith(
      "ForgotPasswordForm",
      "submit failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError", async () => {
    const err = new Error("network down");
    fetchMock.mockRejectedValueOnce(err);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalled());
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  mockLogError.mockClear();
  vi.stubGlobal("fetch", fetchMock);
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
  });

  // Logger migration (cfw-logger batch 4): the catch path forwards the
  // thrown error to logError so transient network/runtime failures are
  // observable in Sentry independently of explicit API-returned errors.
  it("calls logError with source='forgot-password-form' on fetch throw", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledTimes(1);
    });
    expect(mockLogError.mock.calls[0][0]).toBe("forgot-password-form");
  });

  it("passes op='submit' and the thrown error through to logError", async () => {
    const err = new Error("network down");
    fetchMock.mockRejectedValueOnce(err);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled();
    });
    const [, op, passed] = mockLogError.mock.calls[0];
    expect(op).toBe("submit");
    expect(passed).toBe(err);
  });

  it("does NOT call logError when the API returns an explicit error (handled path)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Please enter a valid email address." }),
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "bad");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

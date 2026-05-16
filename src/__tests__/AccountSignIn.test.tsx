import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { AccountSignIn } from "@/components/account/AccountSignIn";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  mockLogError.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

// Logger migration (cfw-logger batch 8). AccountSignIn previously logged
// fetch-throw failures via bare console.error. This file pins the logError
// migration (source/op tag + happy-path no-op) and the basic render contract
// since the surface previously had no dedicated test file.
describe("<AccountSignIn />", () => {
  it("renders the email + password fields and submit button", () => {
    render(<AccountSignIn />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls logError with source='account-signin' op='submit' on fetch throw", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledTimes(1);
    });
    const [source, op] = mockLogError.mock.calls[0];
    expect(source).toBe("account-signin");
    expect(op).toBe("submit");
  });

  it("passes the thrown error object through to logError as the err arg", async () => {
    const err = new Error("network down");
    fetchMock.mockRejectedValueOnce(err);
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalled();
    });
    expect(mockLogError.mock.calls[0][2]).toBe(err);
  });

  it("does NOT call logError when the API returns a handled error (UX message, not Sentry-worthy)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Email or password is incorrect." }),
    });
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockLogError).not.toHaveBeenCalled();
  });
});

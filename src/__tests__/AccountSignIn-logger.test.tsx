import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// cfw-logger migration: AccountSignIn's catch routes through
// logError("AccountSignIn", "login failed", err). New dedicated test
// file (the original AccountSignIn had no unit tests — full coverage of
// the component is out of scope for this migration PR; we focus on
// pinning the logger contract).

const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import { AccountSignIn } from "@/components/account/AccountSignIn";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  logErrorMock.mockReset();
});

describe("<AccountSignIn /> — logError observability", () => {
  it("calls logError when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "u@x.com");
    await user.type(screen.getByLabelText(/password/i), "pw");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalledTimes(1));
  });

  it("tags logError with scope='AccountSignIn' and message='login failed'", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "u@x.com");
    await user.type(screen.getByLabelText(/password/i), "pw");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalled());
    expect(logErrorMock).toHaveBeenCalledWith(
      "AccountSignIn",
      "login failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError", async () => {
    const err = new Error("network down");
    fetchMock.mockRejectedValueOnce(err);
    const user = userEvent.setup();
    render(<AccountSignIn />);
    await user.type(screen.getByLabelText(/email/i), "u@x.com");
    await user.type(screen.getByLabelText(/password/i), "pw");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(logErrorMock).toHaveBeenCalled());
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
  });
});

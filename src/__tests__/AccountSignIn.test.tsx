// cfw-amfn: contract tests for AccountSignIn's logError migration.
// Three cases pin the failure path + verify the inline-error UX
// contract stays intact:
//   1. Velo error.error returns inline error, NO logError (expected
//      auth failure — wrong password is a state, not an event)
//   2. fetch rejects with network error → logError + inline error
//   3. Velo returns ok:false without an error message → logError fires
//      because we synthesize an "unexpected_response" Error

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoisted so the component's logError import resolves to the mock.
const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

// AccountSignIn navigates via window.location.href on success — stub
// it so jsdom doesn't error and we can assert on the navigation.
const originalLocation = window.location;

import { AccountSignIn } from "@/components/account/AccountSignIn";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  mockLogError.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, href: "https://test.local/account" },
  });
});

async function fillAndSubmit() {
  const user = userEvent.setup();
  render(<AccountSignIn />);
  await user.type(screen.getByLabelText(/email/i), "a@b.com");
  await user.type(screen.getByLabelText(/password/i), "hunter2");
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("<AccountSignIn /> — logError migration (cfw-amfn)", () => {
  it("Velo returns { error }: shows inline error, does NOT call logError (expected auth fail)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Incorrect email or password." }),
    } as unknown as Response);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /incorrect email or password/i,
      );
    });
    // Wrong password is a STATE, not an event to alert on.
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("fetch rejects (network down): logError fires + generic inline error (cfw-amfn)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /sign-in failed/i,
      );
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "AccountSignIn",
      "login",
      expect.any(Error),
    );
  });

  it("Velo returns no ok + no error (malformed): logError fires for synthesized 'unexpected_response'", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);

    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockLogError).toHaveBeenCalledWith(
      "AccountSignIn",
      "login",
      expect.any(Error),
    );
  });
});

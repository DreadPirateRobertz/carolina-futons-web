import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/logging/log-error", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import AdminError from "@/app/admin/error";

beforeEach(() => {
  mockLogError.mockClear();
});

// cfw-1rb: route-group error boundary for /admin/*. Tests pin the
// admin-themed CTAs (Try Again uses reset, Owner home links to /admin),
// the digest surface for support correlation, and the absence of any
// link to the storefront (/, /shop) which would be misleading for an
// owner stranded mid-edit.

describe("/admin/error", () => {
  it("renders an alert role with the broken-page heading", () => {
    render(
      <AdminError
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );
    const region = screen.getByTestId("admin-error");
    expect(region).toHaveAttribute("role", "alert");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /admin page hit an error/i,
      }),
    ).toBeInTheDocument();
  });

  it("Try Again button calls the reset prop on click", () => {
    const reset = vi.fn();
    render(<AdminError error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByTestId("admin-error-retry"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("Owner home link points to /admin (not /)", () => {
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByTestId("admin-error-home-link")).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("renders error.digest when present (for support correlation)", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<AdminError error={error} reset={vi.fn()} />);
    expect(screen.getByTestId("admin-error-digest")).toHaveTextContent(
      "Ref: abc123",
    );
  });

  it("omits the digest line when no digest is present", () => {
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.queryByTestId("admin-error-digest")).toBeNull();
  });

  it("does NOT link to the storefront (/, /shop) — wrong audience", () => {
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    // The root error boundary has 'Back to home' pointing at /. Catch
    // a regression that copies the wrong wording into this admin variant.
    expect(screen.queryByRole("link", { name: /back to home/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /shop/i })).toBeNull();
  });

  // Logger migration (cfw-logger batch 3): the boundary now forwards to
  // logError so the error lands in Sentry with the "admin-error-boundary"
  // source tag. Three tests pin: source/op shape, error pass-through, and
  // that the previous bare console.error path is gone.
  it("calls logError on mount with source='admin-error-boundary'", () => {
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][0]).toBe("admin-error-boundary");
  });

  it("passes op='client-render' and the error object through to logError", () => {
    const error = Object.assign(new Error("kaboom"), { digest: "d-7" });
    render(<AdminError error={error} reset={vi.fn()} />);
    const [, op, err] = mockLogError.mock.calls[0];
    expect(op).toBe("client-render");
    expect(err).toBe(error);
  });

  it("does NOT call console.error directly (Sentry path is logError)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    expect(spy).not.toHaveBeenCalledWith(
      "[admin error boundary]",
      expect.any(Error),
    );
    spy.mockRestore();
  });
});

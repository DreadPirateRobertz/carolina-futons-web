import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import AdminError from "@/app/admin/error";

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

  it("logs the error to console.error inside useEffect (Sentry capture)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AdminError error={new Error("boom")} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith(
      "[admin error boundary]",
      expect.any(Error),
    );
    spy.mockRestore();
  });
});

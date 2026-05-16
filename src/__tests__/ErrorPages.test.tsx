import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockLogError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/log", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import NotFound from "@/app/not-found";
import RootError from "@/app/error";

// cf-error-pages: the pages themselves already ship CF-branded copy.
// These tests lock down the export signatures + the essentials melania
// named: headline, shop + home links (404) and retry button + home link
// (error). They deliberately don't pin the copy — headlines can be
// reworded without test churn.

describe("NotFound (404) page", () => {
  it("is a default-exported component", () => {
    expect(typeof NotFound).toBe("function");
  });

  it("renders a headline and the two navigation escapes (/shop and /)", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/shop");
    expect(hrefs).toContain("/");
  });
});

describe("RootError boundary page", () => {
  beforeEach(() => {
    mockLogError.mockClear();
  });

  it("is a default-exported component", () => {
    expect(typeof RootError).toBe("function");
  });

  it("renders a retry button that accepts reset, plus a home link", () => {
    const reset = () => {};
    const error = Object.assign(new Error("boom"), { digest: undefined });
    render(<RootError error={error} reset={reset} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
    const home = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "/");
    expect(home).toBeTruthy();
  });

  // Logger migration: useEffect on mount forwards the error to logError
  // (replacing the previous bare console.error). Three tests pin the
  // tag shape so future readers can tell which Sentry source this
  // boundary maps to and that the error object itself flows through.
  it("calls logError on mount with source='root-error-boundary'", () => {
    render(
      <RootError
        error={Object.assign(new Error("boom"), { digest: undefined })}
        reset={() => {}}
      />,
    );
    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][0]).toBe("root-error-boundary");
  });

  it("passes 'client-render' as the op tag and the error object as err", () => {
    const error = Object.assign(new Error("kaboom"), { digest: "d-42" });
    render(<RootError error={error} reset={() => {}} />);
    const [, op, err] = mockLogError.mock.calls[0];
    expect(op).toBe("client-render");
    expect(err).toBe(error);
  });

  it("renders the Next-assigned digest when present (for support refs)", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123def" });
    render(<RootError error={error} reset={() => {}} />);
    expect(screen.getByText(/abc123def/)).toBeTruthy();
  });
});

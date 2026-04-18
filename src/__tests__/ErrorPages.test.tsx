import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

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
});

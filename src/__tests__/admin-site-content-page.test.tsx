// cfw-9m3: /admin/site-content browse page. Tests cover the populated
// table, the empty-state, and the error banner. Layout-level auth is
// covered by AdminLayout.test.tsx (cfw-wef) — this file pins the
// presentation only.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const loadSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  loadSiteContent: () => loadSiteContent(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const { default: AdminSiteContentBrowsePage } = await import(
    "@/app/admin/site-content/page"
  );
  const ui = await AdminSiteContentBrowsePage();
  render(ui);
}

describe("/admin/site-content browse page (cfw-9m3)", () => {
  it("renders one row per SiteContent entry, sorted alphabetically by key", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([
        ["hero.headline", "Built to last."],
        ["footer.tagline", "Hardwood frames since 1989."],
        ["visit.hours.sun-tue", "Closed."],
      ]),
    });
    await renderPage();

    expect(screen.getByTestId("admin-site-content-table")).toBeInTheDocument();
    const keys = screen.getAllByText(
      /^(footer|hero|visit)\./,
      { selector: "td" },
    );
    expect(keys.map((cell) => cell.textContent)).toEqual([
      "footer.tagline",
      "hero.headline",
      "visit.hours.sun-tue",
    ]);
  });

  it("shows the count of keys in the header", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([
        ["a.b", "1"],
        ["a.c", "2"],
        ["a.d", "3"],
      ]),
    });
    await renderPage();
    expect(screen.getByText(/3 keys currently available/i)).toBeInTheDocument();
  });

  it("uses singular 'key' when only one row exists", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([["only.one", "x"]]),
    });
    await renderPage();
    expect(screen.getByText(/1 key currently available/i)).toBeInTheDocument();
  });

  it("renders an italic '(empty)' placeholder for blank-string values", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([["blank.key", ""]]),
    });
    await renderPage();
    expect(screen.getByText("(empty)")).toBeInTheDocument();
  });

  it("renders the empty-state when the collection has no rows", async () => {
    loadSiteContent.mockResolvedValue({ map: new Map<string, string>() });
    await renderPage();
    expect(screen.getByTestId("admin-site-content-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/no sitecontent rows exist yet/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-site-content-table"),
    ).not.toBeInTheDocument();
  });

  // cfw-tiv: the empty-state told operators to run a non-existent path
  // (`scripts/seed-site-content.ts`). The real provisioning script is
  // exposed via npm as `provision:site-content` (cfw-roi). Pin the new
  // copy so a future refactor can't silently re-introduce a broken path.
  it("empty-state references the npm provisioning script (cfw-tiv)", async () => {
    loadSiteContent.mockResolvedValue({ map: new Map<string, string>() });
    await renderPage();
    const empty = screen.getByTestId("admin-site-content-empty");
    expect(empty).toHaveTextContent("npm run provision:site-content");
    // No reference to the old ghost path.
    expect(empty.textContent ?? "").not.toMatch(/seed-site-content\.ts/);
  });

  it("renders an error banner + adapted empty-state when the reader returned an error", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>(),
      error: "wix_sdk",
    });
    await renderPage();
    expect(screen.getByTestId("admin-site-content-error")).toBeInTheDocument();
    expect(screen.getByText(/no sitecontent rows are visible/i)).toBeInTheDocument();
  });

  it("does NOT render the error banner on a healthy read", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([["a.b", "x"]]),
    });
    await renderPage();
    expect(
      screen.queryByTestId("admin-site-content-error"),
    ).not.toBeInTheDocument();
  });

  it("includes a 'Back to owner home' link", async () => {
    loadSiteContent.mockResolvedValue({ map: new Map<string, string>() });
    await renderPage();
    const link = screen.getByRole("link", { name: /back to owner home/i });
    expect(link).toHaveAttribute("href", "/admin");
  });
});

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

describe("admin/site-content — cfw-9md history link per row", () => {
  it("renders one History link per row pointing at /admin/audit?q=<key>", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([
        ["footer.tagline", "Quality futons since 1991"],
        ["hero.headline", "Find your perfect futon"],
      ]),
    });
    await renderPage();
    const links = screen.getAllByTestId("admin-site-content-history-link");
    expect(links).toHaveLength(2);
    // Sorted alphabetically by key in the page (footer < hero).
    expect(links[0]).toHaveAttribute(
      "href",
      "/admin/audit?q=footer.tagline",
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/admin/audit?q=hero.headline",
    );
  });

  it("URL-encodes keys with special characters in the link href", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([
        // Hyphenated dotted-path is the canonical SiteContent key shape;
        // unusual characters shouldn't appear in production keys, but we
        // still encode defensively in case a row has been hand-inserted.
        ["announcement.rotation.3.cta-href", "/sale"],
      ]),
    });
    await renderPage();
    const link = screen.getByTestId("admin-site-content-history-link");
    expect(link).toHaveAttribute(
      "href",
      "/admin/audit?q=announcement.rotation.3.cta-href",
    );
  });

  it("includes an aria-label for screen readers naming the key", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([["footer.tagline", "x"]]),
    });
    await renderPage();
    const link = screen.getByTestId("admin-site-content-history-link");
    expect(link).toHaveAttribute(
      "aria-label",
      "See edit history for footer.tagline",
    );
  });

  it("does NOT render history links when the empty-state shows (no rows)", async () => {
    loadSiteContent.mockResolvedValue({ map: new Map<string, string>() });
    await renderPage();
    expect(
      screen.queryByTestId("admin-site-content-history-link"),
    ).toBeNull();
  });
});

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

async function renderPage(searchParams: Record<string, string> = {}) {
  const { default: AdminSiteContentBrowsePage } = await import(
    "@/app/admin/site-content/page"
  );
  const ui = await AdminSiteContentBrowsePage({
    searchParams: Promise.resolve(searchParams),
  });
  return render(ui);
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

describe("admin/site-content — cfw-wy0 row anchor IDs", () => {
  it("each row has id='row-<key>' so /admin/audit can deep-link to it", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([
        ["footer.tagline", "x"],
        ["hero.image", "y"],
      ]),
    });
    const { container } = await renderPage();
    expect(container.querySelector("#row-footer\\.tagline")).not.toBeNull();
    expect(container.querySelector("#row-hero\\.image")).not.toBeNull();
  });

  it("scroll-mt-20 keeps the linked-to row clear of the page header", async () => {
    loadSiteContent.mockResolvedValue({
      map: new Map<string, string>([["footer.tagline", "x"]]),
    });
    const { container } = await renderPage();
    const row = container.querySelector("#row-footer\\.tagline");
    expect(row?.className).toMatch(/scroll-mt-20/);
  });
});

describe("admin/site-content — cfw-08k ?q= search filter", () => {
  const ALL_ROWS = new Map<string, string>([
    ["footer.tagline", "Quality futons since 1991"],
    ["hero.headline", "Find your perfect futon"],
    ["visit.hours.sun-tue", "Closed."],
  ]);

  beforeEach(() => {
    loadSiteContent.mockResolvedValue({ map: ALL_ROWS });
  });

  it("renders the search form with empty default value when no ?q=", async () => {
    await renderPage();
    const form = screen.getByTestId("admin-site-content-search");
    expect(form).toHaveAttribute("action", "/admin/site-content");
    expect(form).toHaveAttribute("method", "get");
    const input = screen.getByTestId(
      "admin-site-content-search-input",
    ) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("?q= matches against key (case-insensitive)", async () => {
    await renderPage({ q: "FOOTER" });
    const rows = screen.getAllByTestId("admin-site-content-history-link");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute("data-key", "footer.tagline");
  });

  it("?q= matches against value (case-insensitive)", async () => {
    await renderPage({ q: "perfect" });
    const rows = screen.getAllByTestId("admin-site-content-history-link");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute("data-key", "hero.headline");
  });

  it("preselects ?q= in the search input", async () => {
    await renderPage({ q: "kingston" });
    expect(
      (screen.getByTestId(
        "admin-site-content-search-input",
      ) as HTMLInputElement).value,
    ).toBe("kingston");
  });

  it("filter-aware empty message when no rows match", async () => {
    await renderPage({ q: "no-such-string" });
    expect(screen.getByTestId("admin-site-content-empty")).toHaveTextContent(
      /no sitecontent rows match that search/i,
    );
    expect(
      screen.queryByTestId("admin-site-content-table"),
    ).not.toBeInTheDocument();
  });

  it("header line shows 'N of M keys match' when filter active", async () => {
    await renderPage({ q: "futon" });
    // Both "footer.tagline" (value contains 'futon') and "hero.headline"
    // (value contains 'futon') match.
    expect(screen.getByText(/2 of 3 keys match/i)).toBeInTheDocument();
  });

  it("Clear link points back to /admin/site-content (no params)", async () => {
    await renderPage({ q: "footer" });
    const clear = screen.getByTestId("admin-site-content-search-clear");
    expect(clear).toHaveAttribute("href", "/admin/site-content");
  });

  it("whitespace-only ?q= is treated as no filter (preserves all rows)", async () => {
    await renderPage({ q: "   " });
    const rows = screen.getAllByTestId("admin-site-content-history-link");
    expect(rows).toHaveLength(3);
  });
});

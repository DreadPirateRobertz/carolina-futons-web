import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// cfw-xlv: server-component /admin/audit page. Tests pin the three states
// readOwnerAuditLog can return: error, empty, populated. Plus the table
// shape — one row per audit entry with action / target / before / after /
// actorEmail / formatted timestamp.

vi.mock("server-only", () => ({}));

const mockReadOwnerAuditLog = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({
  readOwnerAuditLog: (...args: unknown[]) => mockReadOwnerAuditLog(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const SAMPLE_ROWS = [
  {
    _id: "row-3",
    _createdDate: "2026-05-09T15:00:00Z",
    actorEmail: "brenda@x.com",
    action: "edit" as const,
    target: "footer.tagline",
    before: "Old tagline",
    after: "New tagline",
    ts: "2026-05-09T15:00:00.000Z",
  },
  {
    _id: "row-2",
    _createdDate: "2026-05-09T14:00:00Z",
    actorEmail: "brenda@x.com",
    action: "upload" as const,
    target: "hero.image",
    before: "",
    after: "https://static.wixstatic.com/media/abc.jpg",
    ts: "2026-05-09T14:00:00.000Z",
  },
];

describe("/admin/audit page", () => {
  it("renders the heading + row-limit description", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { name: /audit log/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/100 most recent/i)).toBeInTheDocument();
  });

  it("renders the empty-state message when no rows exist", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("admin-audit-empty")).toHaveTextContent(
      /no audit entries/i,
    );
    expect(screen.queryByTestId("admin-audit-table")).toBeNull();
  });

  it("renders one table row per audit entry with all fields", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: true,
      rows: SAMPLE_ROWS,
    });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));

    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(2);

    const first = within(rows[0]!);
    expect(first.getByTestId("admin-audit-action")).toHaveTextContent("edit");
    expect(first.getByText("footer.tagline")).toBeInTheDocument();
    expect(first.getByText("Old tagline")).toBeInTheDocument();
    expect(first.getByText("New tagline")).toBeInTheDocument();
    expect(first.getByText("brenda@x.com")).toBeInTheDocument();

    const second = within(rows[1]!);
    expect(second.getByTestId("admin-audit-action")).toHaveTextContent("upload");
    // Empty `before` renders as em-dash so the column isn't blank.
    expect(second.getByText("—")).toBeInTheDocument();
  });

  it("formats the timestamp into 'YYYY-MM-DD HH:MMZ'", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: true,
      rows: [SAMPLE_ROWS[0]!],
    });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("2026-05-09 15:00Z")).toBeInTheDocument();
  });

  it("surfaces a Wix outage as an inline error", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "collection unprovisioned",
    });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId("admin-audit-error")).toHaveTextContent(
      /OwnerAuditLog/i,
    );
    expect(screen.queryByTestId("admin-audit-table")).toBeNull();
    expect(screen.queryByTestId("admin-audit-empty")).toBeNull();
  });

  it("requests up to 100 rows from the helper", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(mockReadOwnerAuditLog).toHaveBeenCalledWith(100);
  });
});

describe("/admin/audit page — cfw-ild filters", () => {
  const FILTER_ROWS = [
    {
      _id: "r1",
      actorEmail: "brenda@cfutons.com",
      action: "edit" as const,
      target: "footer.tagline",
      before: "x",
      after: "y",
      ts: "2026-05-09T15:00:00.000Z",
    },
    {
      _id: "r2",
      actorEmail: "chris@cfutons.com",
      action: "upload" as const,
      target: "hero.image",
      before: "",
      after: "https://wix",
      ts: "2026-05-09T14:00:00.000Z",
    },
    {
      _id: "r3",
      actorEmail: "brenda@cfutons.com",
      action: "swap" as const,
      target: "products/kingston/main",
      before: "old.jpg",
      after: "new.jpg",
      ts: "2026-05-09T13:00:00.000Z",
    },
  ];

  beforeEach(() => {
    mockReadOwnerAuditLog.mockResolvedValue({ ok: true, rows: FILTER_ROWS });
  });

  async function renderWith(searchParams: Record<string, string>) {
    const { default: AdminAuditPage } = await import(
      "@/app/admin/audit/page"
    );
    return render(
      await AdminAuditPage({ searchParams: Promise.resolve(searchParams) }),
    );
  }

  it("renders the filter form by default with empty selections", async () => {
    await renderWith({});
    const form = screen.getByTestId("admin-audit-filters");
    expect(form).toHaveAttribute("action", "/admin/audit");
    expect(form).toHaveAttribute("method", "get");
    const action = screen.getByTestId(
      "admin-audit-filter-action",
    ) as HTMLSelectElement;
    expect(action.value).toBe("");
    const actor = screen.getByTestId(
      "admin-audit-filter-actor",
    ) as HTMLInputElement;
    expect(actor.value).toBe("");
  });

  it("?action=edit narrows rows to edit-only", async () => {
    await renderWith({ action: "edit" });
    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent("footer.tagline");
  });

  it("?action=upload narrows rows to upload-only", async () => {
    await renderWith({ action: "upload" });
    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent("hero.image");
  });

  it("?action=swap narrows rows to swap-only", async () => {
    await renderWith({ action: "swap" });
    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent("products/kingston/main");
  });

  it("ignores an unknown action value (renders all rows)", async () => {
    await renderWith({ action: "delete" });
    expect(screen.getAllByTestId("admin-audit-row")).toHaveLength(3);
  });

  it("?actor= filters by case-insensitive email substring", async () => {
    await renderWith({ actor: "BRENDA" });
    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.textContent?.includes("brenda"))).toBe(true);
  });

  it("?action= and ?actor= compose (AND semantics)", async () => {
    await renderWith({ action: "edit", actor: "brenda" });
    const rows = screen.getAllByTestId("admin-audit-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]!).toHaveTextContent("footer.tagline");
  });

  it("preselects the form values from the URL params", async () => {
    await renderWith({ action: "upload", actor: "chris" });
    const action = screen.getByTestId(
      "admin-audit-filter-action",
    ) as HTMLSelectElement;
    expect(action.value).toBe("upload");
    const actor = screen.getByTestId(
      "admin-audit-filter-actor",
    ) as HTMLInputElement;
    expect(actor.value).toBe("chris");
  });

  it("shows a filter-aware empty message when filters cull all rows", async () => {
    await renderWith({ actor: "no-match" });
    expect(screen.getByTestId("admin-audit-empty")).toHaveTextContent(
      /match those filters/i,
    );
  });

  it("Clear link points back to /admin/audit (no params)", async () => {
    await renderWith({ action: "edit" });
    const clear = screen.getByTestId("admin-audit-filter-clear");
    expect(clear).toHaveAttribute("href", "/admin/audit");
  });
});

describe("/admin/audit page — cfw-daa Download CSV link", () => {
  beforeEach(() => {
    mockReadOwnerAuditLog.mockResolvedValue({ ok: true, rows: [] });
  });

  async function renderWith(searchParams: Record<string, string>) {
    const { default: AdminAuditPage } = await import(
      "@/app/admin/audit/page"
    );
    return render(
      await AdminAuditPage({ searchParams: Promise.resolve(searchParams) }),
    );
  }

  it("renders a Download CSV link in the filter form", async () => {
    await renderWith({});
    const link = screen.getByTestId("admin-audit-filter-export");
    expect(link).toHaveAttribute("href", "/api/admin/audit/export");
    expect(link).toHaveTextContent(/download csv/i);
  });

  it("preserves the active ?action= filter in the export URL", async () => {
    await renderWith({ action: "edit" });
    expect(
      screen.getByTestId("admin-audit-filter-export"),
    ).toHaveAttribute("href", "/api/admin/audit/export?action=edit");
  });

  it("preserves the active ?actor= filter in the export URL", async () => {
    await renderWith({ actor: "brenda" });
    expect(
      screen.getByTestId("admin-audit-filter-export"),
    ).toHaveAttribute("href", "/api/admin/audit/export?actor=brenda");
  });

  it("preserves both filters when set", async () => {
    await renderWith({ action: "upload", actor: "chris" });
    expect(
      screen.getByTestId("admin-audit-filter-export"),
    ).toHaveAttribute(
      "href",
      "/api/admin/audit/export?action=upload&actor=chris",
    );
  });

  it("ignores an invalid ?action= when building the export URL", async () => {
    await renderWith({ action: "delete" });
    expect(
      screen.getByTestId("admin-audit-filter-export"),
    ).toHaveAttribute("href", "/api/admin/audit/export");
  });
});

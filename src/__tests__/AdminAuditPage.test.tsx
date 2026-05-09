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
    render(await AdminAuditPage());
    expect(
      screen.getByRole("heading", { name: /audit log/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/100 most recent/i)).toBeInTheDocument();
  });

  it("renders the empty-state message when no rows exist", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage());
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
    render(await AdminAuditPage());

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
    render(await AdminAuditPage());
    expect(screen.getByText("2026-05-09 15:00Z")).toBeInTheDocument();
  });

  it("surfaces a Wix outage as an inline error", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "collection unprovisioned",
    });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage());
    expect(screen.getByTestId("admin-audit-error")).toHaveTextContent(
      /OwnerAuditLog/i,
    );
    expect(screen.queryByTestId("admin-audit-table")).toBeNull();
    expect(screen.queryByTestId("admin-audit-empty")).toBeNull();
  });

  it("requests up to 100 rows from the helper", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    const { default: AdminAuditPage } = await import("@/app/admin/audit/page");
    render(await AdminAuditPage());
    expect(mockReadOwnerAuditLog).toHaveBeenCalledWith(100);
  });
});

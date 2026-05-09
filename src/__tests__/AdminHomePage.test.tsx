// cfw-vtx: /admin landing — replaces the cfw-wef placeholder copy with
// a real nav surface listing the owner-mode tools shipped under cfw-6qd.
// Auth gate is covered by AdminLayout.test.tsx (cfw-wef); here we only
// pin the presentation.
//
// cfw-f2u: extended with a "Recent activity" card that shows the 5 most
// recent OwnerAuditLog rows. New tests pin the three states (error,
// empty, populated) plus the "View all" link to /admin/audit.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("server-only", () => ({}));

const mockReadOwnerAuditLog = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({
  readOwnerAuditLog: (...args: unknown[]) => mockReadOwnerAuditLog(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockReadOwnerAuditLog.mockResolvedValue({ ok: true, rows: [] });
});

async function renderHome() {
  const { default: AdminHomePage } = await import("@/app/admin/page");
  return render(await AdminHomePage());
}

describe("AdminHomePage (cfw-vtx)", () => {
  it("renders the Owner mode heading", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { level: 1, name: /owner mode/i }),
    ).toBeInTheDocument();
  });

  it("links to the Browse SiteContent surface", async () => {
    await renderHome();
    const link = screen.getByRole("link", { name: /browse sitecontent/i });
    expect(link).toHaveAttribute("href", "/admin/site-content");
  });

  it("renders the storefront-affordances section (inline pencils + image replace)", async () => {
    await renderHome();
    const onSite = screen.getByTestId("admin-home-on-site");
    expect(onSite).toBeInTheDocument();
    expect(screen.getByText(/inline pencils on copy/i)).toBeInTheDocument();
    expect(screen.getByText(/inline image replace/i)).toBeInTheDocument();
  });

  it("links back to the storefront", async () => {
    await renderHome();
    const back = screen.getByRole("link", { name: /back to the storefront/i });
    expect(back).toHaveAttribute("href", "/");
  });

  it("does NOT render the legacy 'up next' placeholder copy", async () => {
    await renderHome();
    // The original cfw-wef copy framed several sub-beads as 'up next'.
    // Once one of the listed sub-beads ships, that copy is misleading —
    // catch a regression that re-introduces it.
    expect(screen.queryByText(/up next \(cfw-6qd/i)).not.toBeInTheDocument();
  });
});

describe("AdminHomePage — cfw-f2u Recent activity card", () => {
  it("renders a 'Recent activity' heading + 'View all' link to /admin/audit", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { name: /recent activity/i }),
    ).toBeInTheDocument();
    const viewAll = screen.getByTestId("admin-home-recent-view-all");
    expect(viewAll).toHaveAttribute("href", "/admin/audit");
  });

  it("requests up to 5 rows from the helper", async () => {
    await renderHome();
    expect(mockReadOwnerAuditLog).toHaveBeenCalledWith(5);
  });

  it("shows the empty-state message when no rows", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({ ok: true, rows: [] });
    await renderHome();
    expect(screen.getByTestId("admin-home-recent-empty")).toHaveTextContent(
      /no recent activity/i,
    );
    expect(screen.queryByTestId("admin-home-recent-list")).toBeNull();
  });

  it("renders one row per audit entry with action + actor + target", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: true,
      rows: [
        {
          _id: "r1",
          actorEmail: "brenda@x.com",
          action: "edit",
          target: "footer.tagline",
          before: "old",
          after: "new",
          ts: "2026-05-09T15:00:00.000Z",
        },
        {
          _id: "r2",
          actorEmail: "chris@x.com",
          action: "upload",
          target: "hero.image",
          before: "",
          after: "https://x",
          ts: "2026-05-09T14:00:00.000Z",
        },
      ],
    });
    await renderHome();
    const rows = screen.getAllByTestId("admin-home-recent-row");
    expect(rows).toHaveLength(2);
    const first = within(rows[0]!);
    expect(first.getByText("brenda@x.com")).toBeInTheDocument();
    expect(first.getByText("footer.tagline")).toBeInTheDocument();
    expect(first.getByTestId("admin-home-recent-action")).toHaveTextContent(
      "edit",
    );
  });

  it("formats the timestamp into 'YYYY-MM-DD HH:MMZ'", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: true,
      rows: [
        {
          _id: "r1",
          actorEmail: "brenda@x.com",
          action: "edit",
          target: "footer.tagline",
          before: "",
          after: "",
          ts: "2026-05-09T15:00:00.000Z",
        },
      ],
    });
    await renderHome();
    expect(screen.getByText("2026-05-09 15:00Z")).toBeInTheDocument();
  });

  it("surfaces a Wix outage as an inline error", async () => {
    mockReadOwnerAuditLog.mockResolvedValueOnce({
      ok: false,
      reason: "wix_outage",
      error: "down",
    });
    await renderHome();
    expect(screen.getByTestId("admin-home-recent-error")).toHaveTextContent(
      /OwnerAuditLog/i,
    );
    expect(screen.queryByTestId("admin-home-recent-list")).toBeNull();
    expect(screen.queryByTestId("admin-home-recent-empty")).toBeNull();
  });
});

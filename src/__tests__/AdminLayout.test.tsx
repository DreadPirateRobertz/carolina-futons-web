import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-wef (cfw-6qd.1): the /admin route group's layout enforces the owner
// gate. These tests pin three things: (1) the gate is reached on every
// render path that includes the layout; (2) when the gate succeeds the
// shell renders the owner's email and a sign-out form pointed at
// /api/admin/sign-out; (3) the gate's redirect is fatal (layout never
// renders content for non-owners).

vi.mock("server-only", () => ({}));

const requireOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  requireOwnerSession: (...args: unknown[]) => requireOwnerSession(...args),
}));

// cfw-f2u: AdminHomePage now calls readOwnerAuditLog for the recent-activity
// card. Stub it so the existing AdminHomePage assertions in this file don't
// need to set up its return shape — empty rows is the simplest baseline.
vi.mock("@/lib/admin/audit-log", () => ({
  readOwnerAuditLog: () => Promise.resolve({ ok: true, rows: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminLayout", () => {
  it("calls requireOwnerSession before rendering content", async () => {
    requireOwnerSession.mockResolvedValueOnce({
      email: "brenda@carolinafutons.com",
      memberId: "member-owner",
      accessToken: "tok",
      tokens: {},
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");
    render(await AdminLayout({ children: <p>child</p> }));
    expect(requireOwnerSession).toHaveBeenCalledTimes(1);
  });

  it("renders the owner email in the shell header", async () => {
    requireOwnerSession.mockResolvedValueOnce({
      email: "brenda@carolinafutons.com",
      memberId: "member-owner",
      accessToken: "tok",
      tokens: {},
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");
    render(await AdminLayout({ children: <p>child content</p> }));
    expect(screen.getByTestId("admin-owner-email")).toHaveTextContent(
      "brenda@carolinafutons.com",
    );
    expect(screen.getByText(/owner mode/i)).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders a sign-out form pointing at /api/admin/sign-out", async () => {
    requireOwnerSession.mockResolvedValueOnce({
      email: "brenda@carolinafutons.com",
      memberId: "member-owner",
      accessToken: "tok",
      tokens: {},
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");
    const { container } = render(
      await AdminLayout({ children: <p>child</p> }),
    );
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("action")).toBe("/api/admin/sign-out");
    expect(form?.getAttribute("method")).toBe("post");
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("propagates the gate redirect (layout body never runs for non-owners)", async () => {
    requireOwnerSession.mockRejectedValueOnce(new Error("REDIRECT:/"));
    const { default: AdminLayout } = await import("@/app/admin/layout");
    await expect(
      AdminLayout({ children: <p>child</p> }),
    ).rejects.toThrow("REDIRECT:/");
  });
});

describe("AdminHomePage", () => {
  it("renders the owner-mode heading + back link", async () => {
    const { default: AdminHomePage } = await import("@/app/admin/page");
    render(await AdminHomePage());
    expect(
      screen.getByRole("heading", { name: /owner mode/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to the storefront/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

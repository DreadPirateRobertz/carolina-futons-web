import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-v5w (cfw-6qd.2): EditableText is the server-component wrapper that
// gates the pencil affordance on getOwnerSession(). Tests pin both gate
// paths and confirm the non-owner render is markup-clean (no editor JS,
// no data-owner-mode attr) so swapping a hardcoded string for
// <EditableText> has zero impact on regular visitors.

vi.mock("server-only", () => ({}));

const mockGetSiteContent = vi.fn(async (_key: string, fallback = "") => fallback);
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (key: string, fallback?: string) =>
    mockGetSiteContent(key, fallback ?? ""),
}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: () => mockGetOwnerSession(),
}));

// EditableTextEditor is a client component — stub it so we can assert on
// presence/absence without exercising its internal state.
vi.mock("@/components/admin/EditableTextEditor", () => ({
  EditableTextEditor: ({ contentKey, initialValue }: { contentKey: string; initialValue: string }) => (
    <button
      type="button"
      data-testid="mock-editor"
      data-key={contentKey}
      data-value={initialValue}
    >
      mock editor
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSiteContent.mockImplementation(
    async (_key: string, fallback = "") => fallback,
  );
  mockGetOwnerSession.mockResolvedValue(null);
});

describe("EditableText — non-owner render", () => {
  it("renders the SiteContent value as the requested element", async () => {
    mockGetSiteContent.mockResolvedValueOnce("Hardwood frames since 1991");
    const { EditableText } = await import("@/components/admin/EditableText");
    render(
      await EditableText({
        contentKey: "footer.tagline",
        fallback: "...",
        as: "p",
      }),
    );
    const el = screen.getByText("Hardwood frames since 1991");
    expect(el.tagName.toLowerCase()).toBe("p");
  });

  it("falls back to the provided fallback when getSiteContent returns it", async () => {
    // Default mock returns the fallback; assert that's what the user sees.
    const { EditableText } = await import("@/components/admin/EditableText");
    render(
      await EditableText({
        contentKey: "missing.key",
        fallback: "Default copy",
      }),
    );
    expect(screen.getByText("Default copy")).toBeInTheDocument();
  });

  it("does NOT render the editor for non-owners (no JS leak)", async () => {
    const { EditableText } = await import("@/components/admin/EditableText");
    render(
      await EditableText({ contentKey: "footer.tagline", fallback: "x" }),
    );
    expect(screen.queryByTestId("mock-editor")).toBeNull();
  });

  it("does NOT set data-owner-mode for non-owners", async () => {
    const { EditableText } = await import("@/components/admin/EditableText");
    const { container } = render(
      await EditableText({ contentKey: "k", fallback: "v" }),
    );
    const el = container.querySelector('[data-slot="editable-text"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-owner-mode")).toBeNull();
  });

  it("defaults to a <span> when `as` is omitted", async () => {
    const { EditableText } = await import("@/components/admin/EditableText");
    const { container } = render(
      await EditableText({ contentKey: "k", fallback: "v" }),
    );
    const el = container.querySelector('[data-slot="editable-text"]');
    expect(el?.tagName.toLowerCase()).toBe("span");
  });
});

describe("EditableText — owner render", () => {
  beforeEach(() => {
    mockGetOwnerSession.mockResolvedValue({
      email: "brenda@carolinafutons.com",
      memberId: "member-owner",
      accessToken: "tok",
      tokens: {},
    });
  });

  it("renders the value AND the editor", async () => {
    mockGetSiteContent.mockResolvedValueOnce("Visit Hendersonville");
    const { EditableText } = await import("@/components/admin/EditableText");
    render(
      await EditableText({ contentKey: "hero.headline", fallback: "..." }),
    );
    expect(screen.getByText("Visit Hendersonville")).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
  });

  it("passes the contentKey + resolved value to the editor", async () => {
    mockGetSiteContent.mockResolvedValueOnce("Visit Hendersonville");
    const { EditableText } = await import("@/components/admin/EditableText");
    render(
      await EditableText({ contentKey: "hero.headline", fallback: "..." }),
    );
    const editor = screen.getByTestId("mock-editor");
    expect(editor.getAttribute("data-key")).toBe("hero.headline");
    expect(editor.getAttribute("data-value")).toBe("Visit Hendersonville");
  });

  it("sets data-owner-mode='1' on the rendered element", async () => {
    const { EditableText } = await import("@/components/admin/EditableText");
    const { container } = render(
      await EditableText({ contentKey: "k", fallback: "v" }),
    );
    const el = container.querySelector('[data-slot="editable-text"]');
    expect(el?.getAttribute("data-owner-mode")).toBe("1");
  });

  it("merges caller className with the owner-mode hover classes", async () => {
    const { EditableText } = await import("@/components/admin/EditableText");
    const { container } = render(
      await EditableText({
        contentKey: "k",
        fallback: "v",
        className: "text-2xl",
      }),
    );
    const el = container.querySelector('[data-slot="editable-text"]');
    expect(el?.className).toContain("text-2xl");
    // group + relative are needed for the editor's group-hover anchoring.
    expect(el?.className).toContain("group");
    expect(el?.className).toContain("relative");
  });
});

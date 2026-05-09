import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditableTextEditor } from "@/components/admin/EditableTextEditor";

// cfw-v5w (cfw-6qd.2): client-side editor for SiteContent strings.
// Tests pin: closed-state pencil, open-state form (textarea + Save +
// Cancel), Cancel resets value + closes, empty-value validation,
// network error path, non-2xx status path, success path triggers
// window.location.reload().

const fetchMock = vi.fn<typeof fetch>();
const reloadMock = vi.fn();

// cfw-lvd: stub via vi.stubGlobal so afterEach's vi.unstubAllGlobals()
// genuinely restores the original window.location. The previous
// Object.defineProperty(window, "location", ...) wasn't reverted —
// once this file ran, window.location stayed replaced for any later
// test in the same vitest worker, producing order-dependent failures.
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  reloadMock.mockReset();
  vi.stubGlobal("location", {
    ...window.location,
    reload: reloadMock,
    assign: vi.fn(),
    replace: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EditableTextEditor — closed state", () => {
  it("renders a pencil button labelled with the contentKey", () => {
    render(<EditableTextEditor contentKey="footer.tagline" initialValue="Hi" />);
    const btn = screen.getByTestId("editable-text-pencil");
    expect(btn).toHaveAttribute("aria-label", "Edit footer.tagline");
  });

  it("does NOT render the editor dialog before opening", () => {
    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    expect(screen.queryByTestId("editable-text-editor")).toBeNull();
  });
});

describe("EditableTextEditor — open state", () => {
  it("opens an editor dialog with the initial value pre-filled", async () => {
    const user = userEvent.setup();
    render(<EditableTextEditor contentKey="k" initialValue="Hello world" />);
    await user.click(screen.getByTestId("editable-text-pencil"));
    const dialog = screen.getByTestId("editable-text-editor");
    expect(dialog).toHaveAttribute("role", "dialog");
    const textarea = screen.getByLabelText("Value for k") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hello world");
  });

  it("Cancel closes the dialog AND resets edits to the initial value", async () => {
    const user = userEvent.setup();
    render(<EditableTextEditor contentKey="k" initialValue="initial" />);
    await user.click(screen.getByTestId("editable-text-pencil"));

    const textarea = screen.getByLabelText("Value for k") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "edited");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByTestId("editable-text-editor")).toBeNull();
    // Reopen — should show initial, not "edited"
    await user.click(screen.getByTestId("editable-text-pencil"));
    const reopened = screen.getByLabelText("Value for k") as HTMLTextAreaElement;
    expect(reopened.value).toBe("initial");
  });
});

describe("EditableTextEditor — save", () => {
  it("blocks submission of empty / whitespace-only values", async () => {
    const user = userEvent.setup();
    render(<EditableTextEditor contentKey="k" initialValue="hi" />);
    await user.click(screen.getByTestId("editable-text-pencil"));

    const textarea = screen.getByLabelText("Value for k") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "   ");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("editable-text-error")).toHaveTextContent(/empty/i);
  });

  it("POSTs the trimmed value to /api/admin/site-content", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<EditableTextEditor contentKey="hero.headline" initialValue="Old" />);
    await user.click(screen.getByTestId("editable-text-pencil"));

    const textarea = screen.getByLabelText("Value for hero.headline") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "  New copy  ");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/site-content");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ key: "hero.headline", value: "New copy" });
  });

  it("reloads the page on a 2xx response", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-pencil"));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a non-2xx status as an inline error and does NOT reload", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));

    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-pencil"));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("editable-text-error")).toHaveTextContent("404");
    });
    expect(reloadMock).not.toHaveBeenCalled();
    // Editor stays open so the owner can retry.
    expect(screen.getByTestId("editable-text-editor")).toBeInTheDocument();
  });

  it("surfaces a network failure as an inline error", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-pencil"));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("editable-text-error")).toHaveTextContent(/network/i);
    });
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe("EditableTextEditor — cfw-plg ↶ undo flow", () => {
  it("renders an undo button alongside the pencil in closed state", () => {
    render(<EditableTextEditor contentKey="footer.tagline" initialValue="hi" />);
    const undo = screen.getByTestId("editable-text-undo");
    expect(undo).toHaveAttribute(
      "aria-label",
      "Show edit history for footer.tagline",
    );
  });

  it("clicking ↶ fetches history and shows 'No prior versions yet' on empty result", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, rows: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<EditableTextEditor contentKey="footer.tagline" initialValue="hi" />);
    await user.click(screen.getByTestId("editable-text-undo"));

    await waitFor(() =>
      expect(screen.getByTestId("editable-text-history-empty")).toBeInTheDocument(),
    );
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/site-content/history?key=footer.tagline");
  });

  it("renders a versions list with row buttons when history has rows", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          rows: [
            {
              _id: "h-2",
              _createdDate: new Date(Date.now() - 60_000).toISOString(),
              key: "footer.tagline",
              before: "v1",
              after: "v2",
            },
            {
              _id: "h-1",
              _createdDate: new Date(Date.now() - 3_600_000).toISOString(),
              key: "footer.tagline",
              before: "",
              after: "v1",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    render(<EditableTextEditor contentKey="footer.tagline" initialValue="v2" />);
    await user.click(screen.getByTestId("editable-text-undo"));

    await waitFor(() =>
      expect(screen.getByTestId("editable-text-history-list")).toBeInTheDocument(),
    );
    const rows = screen.getAllByTestId("editable-text-history-row");
    expect(rows).toHaveLength(2);
    // First row's `before` is "v1" so the rollback would go back to v1.
    expect(rows[0]).toHaveTextContent("v1");
    // Empty before renders as "(empty)".
    expect(rows[1]).toHaveTextContent("(empty)");
  });

  it("clicking a version row POSTs the rollback through /api/admin/site-content", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            rows: [
              {
                _id: "h-2",
                _createdDate: new Date().toISOString(),
                key: "footer.tagline",
                before: "Old tagline",
                after: "New tagline",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    render(<EditableTextEditor contentKey="footer.tagline" initialValue="New tagline" />);
    await user.click(screen.getByTestId("editable-text-undo"));

    const row = await screen.findByTestId("editable-text-history-row");
    await user.click(row);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("/api/admin/site-content");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ key: "footer.tagline", value: "Old tagline" });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a non-2xx GET response as an inline history error", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 502 }));
    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-undo"));

    await waitFor(() =>
      expect(screen.getByTestId("editable-text-history-error")).toHaveTextContent("502"),
    );
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("surfaces a network failure during GET as an inline history error", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-undo"));

    await waitFor(() =>
      expect(screen.getByTestId("editable-text-history-error")).toHaveTextContent(
        /network/i,
      ),
    );
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("Cancel from the history panel returns to closed state", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, rows: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<EditableTextEditor contentKey="k" initialValue="v" />);
    await user.click(screen.getByTestId("editable-text-undo"));
    await waitFor(() =>
      expect(screen.getByTestId("editable-text-history-panel")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByTestId("editable-text-history-panel")).toBeNull();
    expect(screen.getByTestId("editable-text-pencil")).toBeInTheDocument();
  });
});

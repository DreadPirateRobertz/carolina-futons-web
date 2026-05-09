import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditableTextEditor } from "@/components/admin/EditableTextEditor";

// cfw-v5w (cfw-6qd.2): client-side editor for SiteContent strings.
// Tests pin: closed-state pencil, open-state form (textarea + Save +
// Cancel), Cancel resets value + closes, empty-value validation,
// network error path, non-2xx status path, success path triggers
// window.location.reload().

const fetchMock = vi.fn<typeof fetch>();
const reloadMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  reloadMock.mockReset();
  // jsdom's location.reload is non-configurable on the prototype; redefine
  // on the instance instead so we can assert without touching globals.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: reloadMock, assign: vi.fn(), replace: vi.fn() },
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

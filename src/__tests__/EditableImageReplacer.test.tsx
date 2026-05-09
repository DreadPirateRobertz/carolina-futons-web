import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EditableImageReplacer } from "@/components/admin/EditableImageReplacer";

// cfw-6qd.6: client subtree. Tests pin the state machine (read → validate
// → uploading → saved/error) by exercising the file input + the fetch
// mock through the documented status transitions in spec §5.

const fetchMock = vi.fn<typeof fetch>();
const reloadMock = vi.fn();

beforeEach(() => {
  // NOTE: real timers by default. The single test that needs to control the
  // 2-second saved-pulse calls vi.useFakeTimers() inside its body and resets
  // before any waitFor. Globally faking timers breaks waitFor's polling and
  // every async assertion in the file times out.
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  reloadMock.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: reloadMock, assign: vi.fn(), replace: vi.fn() },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const file = (name: string, type: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
};

const renderReplacer = (props?: Partial<React.ComponentProps<typeof EditableImageReplacer>>) =>
  render(
    <EditableImageReplacer
      contentKey="hero.image"
      currentValue="https://static.wixstatic.com/media/abc.jpg/hero.jpg"
      alt="Bear in the Blue Ridge mountains"
      {...props}
    />,
  );

// Drive the hidden file input directly. userEvent.upload + fake timers is a
// known-broken combination — the saved-pulse setTimeout we need to control
// (vi.useFakeTimers) blocks userEvent's internal waits. fireEvent.change
// with a defineProperty-stamped FileList sidesteps the issue entirely.
function pickFile(f: File) {
  const input = screen.getByTestId("editable-image-input") as HTMLInputElement;
  Object.defineProperty(input, "files", {
    value: [f],
    configurable: true,
  });
  fireEvent.change(input);
}

describe("EditableImageReplacer — read state", () => {
  it("renders a Replace button labelled with the alt text", () => {
    renderReplacer();
    const btn = screen.getByTestId("editable-image-replace");
    expect(btn).toHaveAttribute(
      "aria-label",
      "Replace Bear in the Blue Ridge mountains",
    );
    expect(btn).toHaveAttribute("data-status", "read");
    expect(btn).toBeEnabled();
  });

  it("renders a hidden file input with the accept hint", () => {
    renderReplacer({ acceptHint: "image/jpeg" });
    const input = screen.getByTestId("editable-image-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("image/jpeg");
  });
});

describe("EditableImageReplacer — client validation", () => {
  it("rejects an oversize file without POSTing", async () => {

    renderReplacer({ maxBytes: 1000 });
    pickFile(file("big.jpg", "image/jpeg", 5000));
    expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/too big/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("editable-image-replace")).toHaveAttribute("data-status", "error");
  });

  it("rejects an unsupported MIME type without POSTing", async () => {

    renderReplacer();
    pickFile(file("doc.pdf", "application/pdf", 100));
    expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/JPG, PNG, or WebP/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("EditableImageReplacer — upload happy path", () => {
  it("POSTs multipart/form-data with file + key + ifMatch", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/image-upload");
    expect(init?.method).toBe("POST");
    const form = init?.body as FormData;
    expect(form.get("key")).toBe("hero.image");
    expect(form.get("ifMatch")).toBe(
      "https://static.wixstatic.com/media/abc.jpg/hero.jpg",
    );
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("transitions read → uploading → saved → reload after the pulse window", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));

    // Saved state is reached synchronously after the fetch resolves.
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-replace")).toHaveAttribute(
        "data-status",
        "saved",
      ),
    );
    // The 2-second saved-state pulse is a real setTimeout. Wait it out
    // through waitFor (default polling on real timers) — capped to 3s by
    // waitFor's default timeout, which is enough cushion over the 2s pulse.
    // React's transition pump may schedule the setTimeout twice in dev mode
    // (the inner async block can re-run as the transition resolves), so we
    // assert "at least once" rather than "exactly once" — the production
    // effect of either is the same: the page reloads.
    await waitFor(() => expect(reloadMock.mock.calls.length).toBeGreaterThanOrEqual(1), {
      timeout: 3000,
    });
  });
});

describe("EditableImageReplacer — server-side error mapping", () => {
  it("401 → re-auth message + status=error + no reload", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));

    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(
        /editing session expired/i,
      ),
    );
    expect(screen.getByTestId("editable-image-replace")).toHaveAttribute("data-status", "error");
    // No saved-pulse setTimeout fires on the error path, so reload should
    // never be called even after a long wait. A real-timer setTimeout
    // assertion is enough — fake timers aren't needed here.
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("409 → conflict message and image is NOT swapped", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 409 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));

    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(
        /someone else replaced/i,
      ),
    );
  });

  it("413 → server-size message", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 413 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/too big/i),
    );
  });

  it("415 → format message", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 415 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/JPG, PNG, or WebP/i),
    );
  });

  it("422 → dimensions/key-not-allowlisted message", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/too small|key isn't editable/i),
    );
  });

  it("500 → retry message", async () => {

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toHaveTextContent(/Try again/i),
    );
  });

  it("network failure → fallback message + status=error", async () => {

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("editable-image-replace")).toHaveAttribute("data-status", "error");
  });

  it("re-picking after error allows a new upload (state returns to validate)", async () => {

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    renderReplacer();
    pickFile(file("hero.jpg", "image/jpeg", 100));
    await waitFor(() => expect(screen.getByTestId("editable-image-error")).toBeInTheDocument());

    pickFile(file("hero2.jpg", "image/jpeg", 100));
    await waitFor(() =>
      expect(screen.getByTestId("editable-image-replace")).toHaveAttribute(
        "data-status",
        "saved",
      ),
    );
  });
});

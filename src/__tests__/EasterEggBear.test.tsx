import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { EasterEggBear } from "@/components/mascot/EasterEggBear";

// Strip exit animations so state transitions are synchronous in tests.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      // Destructure framer-motion animation props so they don't land on the
      // real <div> as unknown DOM attributes and produce React warnings.
      div: ({
        children,
        style,
        initial: _i,
        animate: _a,
        exit: _e,
        transition: _t,
        ...rest
      }: React.HTMLAttributes<HTMLDivElement> & {
        initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown;
      }) => <div style={style} {...rest}>{children}</div>,
    },
  };
});

const writeText = vi.fn();

// useSyncExternalStore returns true (mounted) in jsdom — portal renders immediately.
beforeEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
});

describe("EasterEggBear", () => {
  it("renders the bear button", () => {
    render(<EasterEggBear />);
    expect(screen.getByRole("button", { name: /peek-a-boo bear/i })).toBeInTheDocument();
  });

  it("does not show the modal before clicking", () => {
    render(<EasterEggBear />);
    expect(screen.queryByText(/you found the bear/i)).toBeNull();
    expect(screen.queryByText("BEAR10")).toBeNull();
    expect(screen.queryByText(/copied to clipboard/i)).toBeNull();
  });

  it("shows discount modal after clicking bear", () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    expect(screen.getByText(/you found the bear/i)).toBeInTheDocument();
    expect(screen.getByText("BEAR10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy & dismiss/i })).toBeInTheDocument();
  });

  it("renders modal inside document.body (portal escapes transformed ancestors)", () => {
    const { container } = render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    // Modal content must NOT be inside the component's own container.
    expect(within(container).queryByText("BEAR10")).toBeNull();
    // It must be in document.body (appended by createPortal).
    expect(within(document.body).getByText("BEAR10")).toBeInTheDocument();
  });

  it("copies BEAR10 to clipboard and shows confirmation on dismiss", async () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy & dismiss/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("BEAR10"));
    expect(screen.queryByText("BEAR10")).toBeNull();
    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it("confirmation is also portaled to document.body", async () => {
    const { container } = render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy & dismiss/i }));
    await waitFor(() =>
      expect(within(document.body).getByText(/copied to clipboard/i)).toBeInTheDocument(),
    );
    expect(within(container).queryByText(/copied to clipboard/i)).toBeNull();
  });

  it("dismisses silently when clipboard write rejects", async () => {
    writeText.mockRejectedValue(new DOMException("NotAllowedError"));
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy & dismiss/i }));
    await waitFor(() => expect(screen.queryByText("BEAR10")).toBeNull());
    expect(screen.queryByText(/copied to clipboard/i)).toBeNull();
  });

  it("dismisses silently when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy & dismiss/i }));
    await waitFor(() => expect(screen.queryByText("BEAR10")).toBeNull());
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText(/copied to clipboard/i)).toBeNull();
  });

  it("re-clicking bear after claiming does not re-show modal", async () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy & dismiss/i }));
    await waitFor(() => expect(screen.queryByText("BEAR10")).toBeNull());
    // claimed is true, so found&&!claimed is still false even after another click.
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    expect(screen.queryByText("BEAR10")).toBeNull();
    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});

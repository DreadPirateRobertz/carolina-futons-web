import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EasterEggBear } from "@/components/mascot/EasterEggBear";

// Strip exit animations so state transitions are synchronous in tests.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
        <div style={style} {...rest}>{children}</div>
      ),
    },
  };
});

// useSyncExternalStore returns true (mounted) in jsdom — portal renders immediately.

beforeEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
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
  });

  it("shows discount modal after clicking bear", () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    expect(screen.getByText(/you found the bear/i)).toBeInTheDocument();
    expect(screen.getByText("BEAR10")).toBeInTheDocument();
  });

  it("renders modal inside document.body (portal escapes transformed ancestors)", () => {
    const { container } = render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    // Modal content must NOT be inside the component's own container.
    expect(within(container).queryByText("BEAR10")).toBeNull();
    // It must be in document.body (appended by createPortal).
    expect(within(document.body).getByText("BEAR10")).toBeInTheDocument();
  });

  it("shows Dismiss button in modal", () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("hides modal and shows confirmation after dismiss", () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("BEAR10")).toBeNull();
    expect(screen.getByText(/code saved/i)).toBeInTheDocument();
  });

  it("confirmation is also portaled to document.body", () => {
    const { container } = render(<EasterEggBear />);
    fireEvent.click(screen.getByRole("button", { name: /peek-a-boo bear/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(within(container).queryByText(/code saved/i)).toBeNull();
    expect(within(document.body).getByText(/code saved/i)).toBeInTheDocument();
  });
});

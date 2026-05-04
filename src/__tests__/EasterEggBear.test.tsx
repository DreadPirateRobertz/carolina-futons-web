import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EasterEggBear } from "@/components/mascot/EasterEggBear";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/mascot/MascotCharacters", () => ({
  Bear: () => <g data-testid="bear-svg" />,
}));

vi.mock("@/components/mascot/MascotPalette", () => ({
  V3_PAL: { paperWarm: "#fff", ink: "#000", cream: "#fafafa" },
}));

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
});

describe("EasterEggBear", () => {
  it("renders bear button in initial state, popup hidden", () => {
    render(<EasterEggBear />);
    expect(screen.getByLabelText("Peek-a-boo bear")).toBeInTheDocument();
    expect(screen.queryByText("You found the bear! 🐻")).toBeNull();
  });

  it("shows discount popup when bear is clicked", () => {
    render(<EasterEggBear />);
    fireEvent.click(screen.getByLabelText("Peek-a-boo bear"));
    expect(screen.getByText("You found the bear! 🐻")).toBeInTheDocument();
    expect(screen.getByText("BEAR10")).toBeInTheDocument();
    expect(screen.getByText("Copy & dismiss")).toBeInTheDocument();
  });

  it("copies BEAR10 to clipboard and shows confirmation on dismiss", async () => {
    writeText.mockResolvedValue(undefined);
    render(<EasterEggBear />);
    fireEvent.click(screen.getByLabelText("Peek-a-boo bear"));
    fireEvent.click(screen.getByText("Copy & dismiss"));

    await waitFor(() =>
      expect(screen.queryByText("You found the bear! 🐻")).toBeNull(),
    );
    expect(writeText).toHaveBeenCalledWith("BEAR10");
    expect(screen.getByText("Copied to clipboard ✓")).toBeInTheDocument();
  });

  it("dismisses silently without confirmation when clipboard is denied", async () => {
    writeText.mockRejectedValue(new DOMException("NotAllowedError"));
    render(<EasterEggBear />);
    fireEvent.click(screen.getByLabelText("Peek-a-boo bear"));
    fireEvent.click(screen.getByText("Copy & dismiss"));

    await waitFor(() =>
      expect(screen.queryByText("You found the bear! 🐻")).toBeNull(),
    );
    expect(screen.queryByText("Copied to clipboard ✓")).toBeNull();
  });

  it("dismisses without error when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    render(<EasterEggBear />);
    fireEvent.click(screen.getByLabelText("Peek-a-boo bear"));
    fireEvent.click(screen.getByText("Copy & dismiss"));

    await waitFor(() =>
      expect(screen.queryByText("You found the bear! 🐻")).toBeNull(),
    );
    expect(screen.queryByText("Copied to clipboard ✓")).toBeNull();
  });

  it("does not show popup or confirmation before bear is clicked", () => {
    render(<EasterEggBear />);
    expect(screen.queryByText("BEAR10")).toBeNull();
    expect(screen.queryByText("Copied to clipboard ✓")).toBeNull();
  });
});

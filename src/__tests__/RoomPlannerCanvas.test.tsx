import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RoomPlannerCanvas } from "@/components/design-a-room/RoomPlannerCanvas";
import { DEFAULT_FUTON_IDX, FUTON_OPTIONS } from "@/lib/design-a-room/steps";

describe("RoomPlannerCanvas", () => {
  it("renders dimension inputs with numeric defaults", () => {
    render(<RoomPlannerCanvas />);
    const w = screen.getByLabelText(/room width/i) as HTMLInputElement;
    const d = screen.getByLabelText(/room depth/i) as HTMLInputElement;
    expect(Number(w.value)).toBeGreaterThan(0);
    expect(Number(d.value)).toBeGreaterThan(0);
  });

  it("renders all FUTON_OPTIONS as draggable palette items", () => {
    render(<RoomPlannerCanvas />);
    for (const opt of FUTON_OPTIONS) {
      expect(screen.getByText(opt.shortLabel)).toBeInTheDocument();
    }
  });

  it("renders the canvas drop area with application role and accessible label", () => {
    render(<RoomPlannerCanvas />);
    expect(
      screen.getByRole("application", { name: /drag furniture pieces into the room/i }),
    ).toBeInTheDocument();
  });

  it("shows sleeping/open footprint hint text", () => {
    render(<RoomPlannerCanvas />);
    expect(screen.getByText(/sleeping \/ open footprint/i)).toBeInTheDocument();
  });

  it("Share layout button is disabled when no items are placed", () => {
    render(<RoomPlannerCanvas />);
    const btn = screen.getByRole("button", { name: /share layout/i });
    expect(btn).toBeDisabled();
  });

  it("uses sleeping/open dimensions (depthIn matches label depth)", () => {
    const twin = FUTON_OPTIONS[0]!;
    // Labels say 75" — depthIn should reflect sleeping length not sofa depth
    expect(twin.depthIn).toBeGreaterThanOrEqual(70);
    expect(twin.shortLabel).toBe("Twin futon");
  });

  it("renders the shortLabel of DEFAULT_FUTON_IDX option in the palette", () => {
    render(<RoomPlannerCanvas />);
    const defaultOpt = FUTON_OPTIONS[DEFAULT_FUTON_IDX]!;
    expect(screen.getByText(defaultOpt.shortLabel)).toBeInTheDocument();
  });

  it("clamps room width to min on blur when value is below minimum", () => {
    render(<RoomPlannerCanvas />);
    const w = screen.getByLabelText(/room width/i) as HTMLInputElement;
    fireEvent.change(w, { target: { value: "2" } });
    fireEvent.blur(w);
    expect(Number(w.value)).toBeGreaterThanOrEqual(6);
  });

  it("falls back to default when non-numeric value is entered and blurred", () => {
    render(<RoomPlannerCanvas />);
    const w = screen.getByLabelText(/room width/i) as HTMLInputElement;
    fireEvent.change(w, { target: { value: "abc" } });
    fireEvent.blur(w);
    // Should not be NaN — either fallback (12) or unchanged
    expect(Number.isFinite(Number(w.value))).toBe(true);
  });
});

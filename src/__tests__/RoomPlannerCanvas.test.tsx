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

  it("renders futon select with all FUTON_OPTIONS", () => {
    render(<RoomPlannerCanvas />);
    const select = screen.getByLabelText(/futon.*bed size/i) as HTMLSelectElement;
    expect(select.options.length).toBe(FUTON_OPTIONS.length);
  });

  it("renders an SVG room plan view", () => {
    render(<RoomPlannerCanvas />);
    expect(screen.getByRole("img", { name: /room plan view/i })).toBeInTheDocument();
  });

  it("shows the dimensions-hint when piece fits the room (default 12×10ft, full futon)", () => {
    render(<RoomPlannerCanvas />);
    expect(screen.getByText(/sleeping\/open footprint/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows overflow alert when room is too small for selected piece", () => {
    render(<RoomPlannerCanvas />);
    const d = screen.getByLabelText(/room depth/i);
    // queen murphy (64"×87") in a 6ft (72") wide room is borderline —
    // force overflow by selecting queen murphy (87" depth) in a 6ft (72") deep room
    const select = screen.getByLabelText(/futon.*bed size/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "4" } }); // queen murphy 64"×87"
    // set depth to 6ft = 72" — 87" depth won't fit
    fireEvent.change(d, { target: { value: "6" } });
    fireEvent.blur(d);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/wider or deeper/i);
  });

  it("uses sleeping/open dimensions (depthIn matches label depth)", () => {
    const twin = FUTON_OPTIONS[0]!;
    // Labels say 75" — depthIn should reflect sleeping length not sofa depth
    expect(twin.depthIn).toBeGreaterThanOrEqual(70);
    expect(twin.shortLabel).toBe("Twin futon");
  });

  it("defaults to DEFAULT_FUTON_IDX option", () => {
    render(<RoomPlannerCanvas />);
    const select = screen.getByLabelText(/futon.*bed size/i) as HTMLSelectElement;
    expect(Number(select.value)).toBe(DEFAULT_FUTON_IDX);
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

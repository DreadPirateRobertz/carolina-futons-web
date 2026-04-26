import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoomPlannerCanvas } from "@/components/design-a-room/RoomPlannerCanvas";
import { FUTON_OPTIONS } from "@/lib/design-a-room/steps";

describe("RoomPlannerCanvas", () => {
  it("renders dimension inputs with numeric defaults", () => {
    render(<RoomPlannerCanvas />);
    const widthInput = screen.getByLabelText(/room width/i) as HTMLInputElement;
    const depthInput = screen.getByLabelText(/room depth/i) as HTMLInputElement;
    expect(Number(widthInput.value)).toBeGreaterThan(0);
    expect(Number(depthInput.value)).toBeGreaterThan(0);
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

  it("shows the dimensions-hint when piece fits the room", () => {
    render(<RoomPlannerCanvas />);
    // default 12×10ft room + full futon fits — hint paragraph should render
    expect(screen.getByText(/approximate/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

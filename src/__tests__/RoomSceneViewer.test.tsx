import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RoomSceneViewer } from "@/components/design-a-room/RoomSceneViewer";
import { ROOM_STYLES, ROOM_STYLE_ORDER, SCENE_PRODUCTS } from "@/lib/design-a-room/room-scenes";

describe("RoomSceneViewer (cf-c0dh)", () => {
  it("renders a style button for each room style", () => {
    render(<RoomSceneViewer />);
    for (const s of ROOM_STYLE_ORDER) {
      expect(screen.getByRole("button", { name: ROOM_STYLES[s].label })).toBeInTheDocument();
    }
  });

  it("renders a product-type button for each scene product", () => {
    render(<RoomSceneViewer />);
    for (const { label } of SCENE_PRODUCTS) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("defaults to Modern style with Futon Frame active", () => {
    render(<RoomSceneViewer />);
    expect(screen.getByRole("button", { name: "Modern" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Rustic" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Futon Frame" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Murphy Bed" })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders an accessible SVG scene container with a descriptive label", () => {
    render(<RoomSceneViewer />);
    expect(screen.getByRole("img", { name: /futon in room/i })).toBeInTheDocument();
  });

  it("pressing Rustic sets it active and deactivates Modern", () => {
    render(<RoomSceneViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Rustic" }));
    expect(screen.getByRole("button", { name: "Rustic" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Modern" })).toHaveAttribute("aria-pressed", "false");
  });

  it("pressing Minimalist sets it active", () => {
    render(<RoomSceneViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Minimalist" }));
    expect(screen.getByRole("button", { name: "Minimalist" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switching to Murphy Bed updates the scene label", () => {
    render(<RoomSceneViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Murphy Bed" }));
    expect(screen.getByRole("img", { name: /murphy bed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Murphy Bed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Futon Frame" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switching to Platform Bed updates the scene label", () => {
    render(<RoomSceneViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Platform Bed" }));
    expect(screen.getByRole("img", { name: /platform bed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Platform Bed" })).toHaveAttribute("aria-pressed", "true");
  });

  it("style and product selections are independent — can combine any pair", () => {
    render(<RoomSceneViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Rustic" }));
    fireEvent.click(screen.getByRole("button", { name: "Murphy Bed" }));
    expect(screen.getByRole("button", { name: "Rustic" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Murphy Bed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /murphy bed/i })).toBeInTheDocument();
  });

  it("renders disclaimer text about illustrative nature", () => {
    render(<RoomSceneViewer />);
    expect(screen.getByText(/illustrative scene/i)).toBeInTheDocument();
  });
});

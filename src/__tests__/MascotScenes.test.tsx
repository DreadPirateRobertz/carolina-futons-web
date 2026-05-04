import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReadingScene } from "@/components/mascot/ReadingScene";
import { FallsScene } from "@/components/mascot/FallsScene";

describe("v3 scene components — smoke", () => {
  it("ReadingScene renders an img with the correct src", () => {
    const { container } = render(<ReadingScene />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/scenes/v3-04-reading.svg");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });

  it("FallsScene renders an img with the correct src", () => {
    const { container } = render(<FallsScene />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/scenes/v3-05-falls.svg");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });

  it("ReadingScene forwards className to the img element", () => {
    const { container } = render(<ReadingScene className="max-h-64" />);
    const img = container.querySelector("img");
    expect(img?.className).toContain("max-h-64");
  });

  it("FallsScene forwards className to the img element", () => {
    const { container } = render(<FallsScene className="max-h-64" />);
    const img = container.querySelector("img");
    expect(img?.className).toContain("max-h-64");
  });
});

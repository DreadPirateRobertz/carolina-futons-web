import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { AboutIllustrationClient } from "@/components/illustrations/AboutIllustrationClient";
import { TeamPortrait } from "@/components/illustrations/TeamPortrait";
import { SAFE_HEX_RE } from "@/lib/illustrations/about-illustrations-svg";

const SIMPLE_SVG_BODY =
  '<title id="t1">Test scene title</title><rect x="0" y="0" width="100" height="50" fill="#B8D4E3"/>';

describe("AboutIllustrationClient", () => {
  it("renders an <svg> with data-slot='about-illustration'", () => {
    const { container } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={100} viewHeight={50} />,
    );
    const svg = container.querySelector("svg[data-slot='about-illustration']");
    expect(svg).not.toBeNull();
  });

  it("sets the viewBox from viewWidth / viewHeight", () => {
    const { container } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={900} viewHeight={500} />,
    );
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 900 500");
  });

  it("inlines the svgBody content", () => {
    const { container } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={100} viewHeight={50} />,
    );
    expect(container.innerHTML).toContain("Test scene title");
  });

  it("merges a caller-supplied className", () => {
    const { container } = render(
      <AboutIllustrationClient
        svgBody={SIMPLE_SVG_BODY}
        viewWidth={100}
        viewHeight={50}
        className="opacity-75"
      />,
    );
    const cls = container.querySelector("svg")?.getAttribute("class") ?? "";
    expect(cls).toContain("opacity-75");
    expect(cls).toContain("w-full");
  });

  it("has role='img' so the embedded <title> is announced", () => {
    const { container } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={100} viewHeight={50} />,
    );
    expect(container.querySelector("svg")?.getAttribute("role")).toBe("img");
  });

  it("sets aria-labelledby when titleId is provided", () => {
    const { container } = render(
      <AboutIllustrationClient
        svgBody={SIMPLE_SVG_BODY}
        viewWidth={100}
        viewHeight={50}
        titleId="t1"
      />,
    );
    expect(container.querySelector("svg")?.getAttribute("aria-labelledby")).toBe("t1");
  });

  it("omits aria-labelledby when titleId is not provided", () => {
    const { container } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={100} viewHeight={50} />,
    );
    expect(container.querySelector("svg")?.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("clears the 60s interval on unmount", () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = render(
      <AboutIllustrationClient svgBody={SIMPLE_SVG_BODY} viewWidth={100} viewHeight={50} />,
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe("SAFE_HEX_RE", () => {
  it("accepts 6-char hex colors", () => {
    expect(SAFE_HEX_RE.test("#B8D4E3")).toBe(true);
    expect(SAFE_HEX_RE.test("#050810")).toBe(true);
  });

  it("accepts 3-char hex shorthand", () => {
    expect(SAFE_HEX_RE.test("#ABC")).toBe(true);
  });

  it("rejects rgba() strings that lerpColor can produce", () => {
    expect(SAFE_HEX_RE.test("rgba(8,13,28,0.95)")).toBe(false);
  });

  it("rejects the 'transparent' keyword", () => {
    expect(SAFE_HEX_RE.test("transparent")).toBe(false);
  });

  it("rejects hex without leading #", () => {
    expect(SAFE_HEX_RE.test("B8D4E3")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(SAFE_HEX_RE.test("")).toBe(false);
  });
});

describe("TeamPortrait", () => {
  it("renders the data-slot wrapper", () => {
    const { container } = render(<TeamPortrait />);
    expect(container.querySelector("[data-slot='team-portrait']")).not.toBeNull();
  });

  it("inlines an SVG with the team portrait title for AT users", () => {
    const { container } = render(<TeamPortrait />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.innerHTML).toContain("Carolina Futons team photographs");
  });

  it("nests an about-illustration SVG inside the wrapper", () => {
    const { container } = render(<TeamPortrait />);
    const wrapper = container.querySelector("[data-slot='team-portrait']");
    expect(wrapper?.querySelector("[data-slot='about-illustration']")).not.toBeNull();
  });

  it("merges a caller-supplied className onto the wrapper", () => {
    const { container } = render(<TeamPortrait className="mt-6" />);
    expect(
      container.querySelector("[data-slot='team-portrait']")?.className,
    ).toContain("mt-6");
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PdpShareButtons } from "@/components/product/PdpShareButtons";

// PdpShareButtons renders Facebook + Pinterest share links on the PDP.
// The share URLs are standardized endpoints (no API keys, no SDKs) — these
// tests pin the encoded query-string contract so a future refactor can't
// silently drop the image or description from a Pinterest pin, or share the
// wrong URL to Facebook.

const URL = "https://carolinafutons.com/products/kingston-futon";
const NAME = "Kingston Futon";
const IMAGE = "https://cdn.example.com/kingston.jpg";

describe("PdpShareButtons", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Facebook share link with the product url encoded in u=", () => {
    render(
      <PdpShareButtons productUrl={URL} productName={NAME} imageUrl={IMAGE} />,
    );
    const fb = screen.getByRole("link", { name: /share on facebook/i });
    const href = fb.getAttribute("href") ?? "";
    expect(href).toContain("facebook.com/sharer/sharer.php");
    expect(href).toContain(`u=${encodeURIComponent(URL)}`);
  });

  it("renders a Pinterest share link with url, media, and description", () => {
    render(
      <PdpShareButtons productUrl={URL} productName={NAME} imageUrl={IMAGE} />,
    );
    const pin = screen.getByRole("link", { name: /share on pinterest/i });
    const href = pin.getAttribute("href") ?? "";
    expect(href).toContain("pinterest.com/pin/create/button");
    expect(href).toContain(`url=${encodeURIComponent(URL)}`);
    expect(href).toContain(`media=${encodeURIComponent(IMAGE)}`);
    expect(href).toContain(`description=${encodeURIComponent(NAME)}`);
  });

  it("opens the share URL in a sized popup via window.open when clicked", () => {
    const open = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    render(
      <PdpShareButtons productUrl={URL} productName={NAME} imageUrl={IMAGE} />,
    );
    fireEvent.click(screen.getByRole("link", { name: /share on facebook/i }));
    expect(open).toHaveBeenCalledTimes(1);
    const [calledUrl, target, features] = open.mock.calls[0];
    expect(String(calledUrl)).toContain("facebook.com/sharer/sharer.php");
    expect(target).toBe("_blank");
    expect(features).toMatch(/width=/);
    expect(features).toMatch(/height=/);
  });

  it("omits the Pinterest media param gracefully when imageUrl is missing", () => {
    render(<PdpShareButtons productUrl={URL} productName={NAME} />);
    const pin = screen.getByRole("link", { name: /share on pinterest/i });
    const href = pin.getAttribute("href") ?? "";
    expect(href).toContain("pinterest.com/pin/create/button");
    expect(href).toContain(`url=${encodeURIComponent(URL)}`);
    expect(href).not.toContain("media=");
  });

  it("uses target=_blank and rel=noopener on each share link for no-JS fallback", () => {
    render(
      <PdpShareButtons productUrl={URL} productName={NAME} imageUrl={IMAGE} />,
    );
    for (const name of [/share on facebook/i, /share on pinterest/i]) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toMatch(/noopener/);
    }
  });
});

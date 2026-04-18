import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VisitPage from "@/app/visit/page";

function renderPage() {
  return render(<VisitPage />);
}

describe("VisitPage — rendering", () => {
  it("renders Visit Us heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /visit us/i })).toBeInTheDocument();
  });

  it("renders location section with address", () => {
    renderPage();
    expect(screen.getByRole("region", { name: /location/i })).toBeInTheDocument();
  });

  it("renders store hours section", () => {
    renderPage();
    expect(screen.getByRole("region", { name: /store hours/i })).toBeInTheDocument();
  });

  it("renders Get directions link pointing to Google Maps", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("maps.google.com"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("directions href URL-encodes the store address", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /get directions/i });
    const href = link.getAttribute("href") ?? "";
    // Encoded store name must appear somewhere in the query
    expect(href).toContain("Carolina");
    expect(href).toContain("Hendersonville");
  });

  it("map iframe has descriptive title", () => {
    const { container } = renderPage();
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("title")).toMatch(/map/i);
  });

  it("map iframe src URL-encodes the store address", () => {
    const { container } = renderPage();
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).toContain("maps.google.com");
    expect(src).toContain("Hendersonville");
  });

  it("renders shop CTA link to /shop", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /browse all products/i }),
    ).toHaveAttribute("href", "/shop");
  });

  it("renders phone link with tel: href", () => {
    renderPage();
    const phoneLink = screen.getByRole("link", { name: /828/i });
    expect(phoneLink.getAttribute("href")).toMatch(/^tel:/);
  });

  it("renders email link with mailto: href", () => {
    renderPage();
    const mailLink = screen.getByRole("link", { name: /carolinafutons@gmail/i });
    expect(mailLink.getAttribute("href")).toMatch(/^mailto:/);
  });
});

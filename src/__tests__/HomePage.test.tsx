import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Stub all four SeaCat sections so jsdom doesn't need to deal with
// framer-motion's scroll hooks or the Playfair variable font.
vi.mock("@/components/seacat/SeacatHero", () => ({
  SeacatHero: () => <section aria-label="hero" data-slot="seacat-hero" />,
}));
vi.mock("@/components/seacat/SeacatChapters", () => ({
  SeacatChapters: () => (
    <section aria-label="Company history" data-slot="seacat-chapters" />
  ),
}));
vi.mock("@/components/seacat/SeacatCollection", () => ({
  SeacatCollection: () => (
    <section aria-label="Shop the collection" data-slot="seacat-collection" />
  ),
}));
vi.mock("@/components/seacat/SeacatCta", () => ({
  SeacatCta: () => <section aria-label="Visit us" data-slot="seacat-cta" />,
}));

async function renderHome() {
  const HomePage = (await import("@/app/page")).default;
  return render(<HomePage />);
}

describe("HomePage — Theme C SeaCat Luxury", () => {
  it("renders the hero section", async () => {
    const { container } = await renderHome();
    expect(container.querySelector('[data-slot="seacat-hero"]')).not.toBeNull();
  });

  it("renders the chapters timeline section", async () => {
    const { container } = await renderHome();
    expect(container.querySelector('[data-slot="seacat-chapters"]')).not.toBeNull();
  });

  it("renders the collection section", async () => {
    const { container } = await renderHome();
    expect(container.querySelector('[data-slot="seacat-collection"]')).not.toBeNull();
  });

  it("renders the CTA section", async () => {
    const { container } = await renderHome();
    expect(container.querySelector('[data-slot="seacat-cta"]')).not.toBeNull();
  });

  it("renders all four sections in document order: hero → chapters → collection → cta", async () => {
    const { container } = await renderHome();
    const slots = Array.from(container.querySelectorAll("[data-slot]")).map(
      (el) => el.getAttribute("data-slot"),
    );
    expect(slots).toEqual([
      "seacat-hero",
      "seacat-chapters",
      "seacat-collection",
      "seacat-cta",
    ]);
  });
});

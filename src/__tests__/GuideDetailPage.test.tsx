import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import GuideDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/guides/[slug]/page";
import { GUIDES } from "@/lib/discovery/guides";

// cf-3qt.8.D: smoke test pinning /guides/[slug] — generateStaticParams covers
// every seed guide, metadata is slug-scoped, and the h1 renders the guide's
// title.

describe("GuideDetailPage", () => {
  it("returns a static param for every seed guide", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(GUIDES.length);
    expect(params.map((p) => p.slug).sort()).toEqual(
      GUIDES.map((g) => g.slug).sort(),
    );
  });

  it("produces slug-scoped metadata for a known guide", async () => {
    const [first] = GUIDES;
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: first.slug }),
    });
    expect(meta.title).toContain(first.title);
    expect(meta.description).toBe(first.hook);
  });

  it("renders the guide h1 + reading-time for a known slug", async () => {
    const [first] = GUIDES;
    const element = await GuideDetailPage({
      params: Promise.resolve({ slug: first.slug }),
    });
    render(element);
    expect(
      screen.getByRole("heading", { level: 1, name: first.title }),
    ).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`${first.readingTimeMin} min read`, "i")),
    ).toBeTruthy();
  });
});

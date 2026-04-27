import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const listGuidesMock = vi.fn();
vi.mock("@/lib/discovery/guides", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/discovery/guides")>();
  return { ...original, listGuides: (...args: unknown[]) => listGuidesMock(...args) };
});

import GuideDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/guides/[slug]/page";
import { GUIDES } from "@/lib/discovery/guides";

beforeEach(() => {
  listGuidesMock.mockReset();
  listGuidesMock.mockResolvedValue(GUIDES);
});

describe("GuideDetailPage", () => {
  it("returns a static param for every seed guide", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(GUIDES.length);
    expect(params.map((p) => p.slug).sort()).toEqual(
      GUIDES.map((g) => g.slug).sort(),
    );
  });

  it("returns static params from CMS when available", async () => {
    listGuidesMock.mockResolvedValue([
      { slug: "cms-guide", title: "CMS", hook: "h", readingTimeMin: 3, coverImageUrl: null },
    ]);
    const params = await generateStaticParams();
    expect(params).toEqual([{ slug: "cms-guide" }]);
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

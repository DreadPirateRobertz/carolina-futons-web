import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-l11g: server-component renders for /blog and /blog/[slug]. We mock the
// Wix data layer + next/navigation so the components render in a unit context.

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const listPosts = vi.fn();
const listAllPostSlugs = vi.fn();
const getPostBySlug = vi.fn();
vi.mock("@/lib/wix/blog", () => ({
  listPosts: (...args: unknown[]) => listPosts(...args),
  listAllPostSlugs: (...args: unknown[]) => listAllPostSlugs(...args),
  getPostBySlug: (...args: unknown[]) => getPostBySlug(...args),
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src as string} alt={alt as string} {...rest} />
    );
  },
}));

import BlogPage from "@/app/blog/page";
import BlogPostPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/blog/[slug]/page";

beforeEach(() => {
  listPosts.mockReset();
  listAllPostSlugs.mockReset();
  getPostBySlug.mockReset();
  notFound.mockClear();
});

describe("/blog index page", () => {
  it("renders the post list when posts come back from Wix", async () => {
    listPosts.mockResolvedValueOnce([
      {
        _id: "p1",
        slug: "futon-vs-sofa-bed",
        title: "Futon vs sofa bed",
        excerpt: "Which one to buy.",
        heroImageUrl: null,
        firstPublishedDate: new Date("2026-04-20T12:00:00.000Z"),
        minutesToRead: 4,
      },
    ]);

    const ui = await BlogPage();
    render(ui);

    expect(
      screen.getByRole("heading", { name: /futon vs sofa bed/i }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /futon vs sofa bed/i });
    expect(link.getAttribute("href")).toBe("/blog/futon-vs-sofa-bed");
    expect(screen.getByText(/4 min read/i)).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it("falls back to the 'Coming soon' state when listPosts returns []", async () => {
    listPosts.mockResolvedValueOnce([]);
    const ui = await BlogPage();
    render(ui);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
    expect(
      screen.queryByText(/futon vs sofa bed/i),
    ).toBeNull();
  });

  it("requests up to 12 posts from the data layer (AC: latest 12)", async () => {
    listPosts.mockResolvedValueOnce([]);
    await BlogPage();
    expect(listPosts).toHaveBeenCalledWith(12);
  });
});

describe("/blog/[slug] dynamic page", () => {
  it("renders the post body and hero when found", async () => {
    getPostBySlug.mockResolvedValueOnce({
      _id: "p1",
      slug: "wool-care",
      title: "Wool mattress care",
      excerpt: "How to air it.",
      heroImageUrl: "https://img/wool.jpg",
      firstPublishedDate: new Date("2026-04-22T10:00:00.000Z"),
      minutesToRead: 6,
      contentText: "First paragraph.\n\nSecond paragraph.",
    });

    const ui = await BlogPostPage({
      params: Promise.resolve({ slug: "wool-care" }),
    });
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: /wool mattress care/i }),
    ).toBeTruthy();
    expect(screen.getByText(/6 min read/i)).toBeTruthy();
    expect(screen.getByText(/first paragraph/i)).toBeTruthy();
    expect(screen.getByText(/second paragraph/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /back to the journal/i }).getAttribute("href"),
    ).toBe("/blog");
    const hero = screen.getByRole("img", { name: /wool mattress care/i });
    expect(hero.getAttribute("src")).toContain("https://img/wool.jpg");
  });

  it("calls notFound() when the post is missing", async () => {
    getPostBySlug.mockResolvedValueOnce(null);
    await expect(
      BlogPostPage({ params: Promise.resolve({ slug: "ghost" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("generateMetadata returns the post title + excerpt-derived description", async () => {
    getPostBySlug.mockResolvedValueOnce({
      _id: "p1",
      slug: "wool-care",
      title: "Wool mattress care",
      excerpt: "How to air it out so it stays fresh through summer.",
      heroImageUrl: "https://img/wool.jpg",
      firstPublishedDate: null,
      minutesToRead: null,
      contentText: "",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "wool-care" }),
    });
    expect(meta.title).toBe("Wool mattress care — Carolina Futons");
    expect(meta.description).toContain("air it out");
    expect(meta.openGraph?.images).toBeTruthy();
  });

  it("generateMetadata sets OG type=article, url, title, and description", async () => {
    getPostBySlug.mockResolvedValueOnce({
      _id: "p2",
      slug: "wool-care",
      title: "Wool mattress care",
      excerpt: "Keep it fresh.",
      heroImageUrl: null,
      firstPublishedDate: null,
      minutesToRead: null,
      contentText: "",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "wool-care" }),
    });
    expect((meta.openGraph as { type?: string })?.type).toBe("article");
    expect((meta.openGraph as { url?: string })?.url).toContain("/blog/wool-care");
    expect(meta.openGraph?.title).toBe("Wool mattress care");
    expect(meta.openGraph?.description).toContain("Keep it fresh");
  });

  it("generateMetadata sets publishedTime from firstPublishedDate", async () => {
    const date = new Date("2025-03-01T12:00:00Z");
    getPostBySlug.mockResolvedValueOnce({
      _id: "p3",
      slug: "spring-care",
      title: "Spring care",
      excerpt: "Tips.",
      heroImageUrl: null,
      firstPublishedDate: date,
      minutesToRead: null,
      contentText: "",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "spring-care" }),
    });
    expect((meta.openGraph as { publishedTime?: string })?.publishedTime).toBe(
      "2025-03-01T12:00:00.000Z",
    );
  });

  it("generateMetadata sets twitter card summary_large_image when hero image present", async () => {
    getPostBySlug.mockResolvedValueOnce({
      _id: "p4",
      slug: "hero-post",
      title: "Hero post",
      excerpt: "Has image.",
      heroImageUrl: "https://img/hero.jpg",
      firstPublishedDate: null,
      minutesToRead: null,
      contentText: "",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "hero-post" }),
    });
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
    expect(meta.twitter?.title).toBe("Hero post");
  });

  it("generateMetadata sets twitter card summary when no hero image", async () => {
    getPostBySlug.mockResolvedValueOnce({
      _id: "p5",
      slug: "text-post",
      title: "Text post",
      excerpt: "No image.",
      heroImageUrl: null,
      firstPublishedDate: null,
      minutesToRead: null,
      contentText: "",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "text-post" }),
    });
    expect((meta.twitter as { card?: string })?.card).toBe("summary");
  });

  it("generateMetadata falls back to a generic title when the post is missing", async () => {
    getPostBySlug.mockResolvedValueOnce(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "ghost" }),
    });
    expect(meta.title).toMatch(/Carolina Futons/);
  });

  it("generateStaticParams returns one entry per slug from the data layer", async () => {
    listAllPostSlugs.mockResolvedValueOnce(["a", "b", "c"]);
    const params = await generateStaticParams();
    expect(params).toEqual([{ slug: "a" }, { slug: "b" }, { slug: "c" }]);
  });
});

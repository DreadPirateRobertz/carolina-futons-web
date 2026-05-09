import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { BlogPostSummary } from "@/lib/wix/blog";

// Mock listPosts so we don't hit the Wix SDK in tests.
const listPostsMock = vi.fn<() => Promise<BlogPostSummary[]>>();

vi.mock("@/lib/wix/blog", () => ({
  listPosts: () => listPostsMock(),
}));

// next/image → plain <img> in jsdom
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
     
    <img src={src} alt={alt} />
  ),
}));

import { BlogTeasers } from "@/components/home/BlogTeasers";

const MOCK_POSTS: BlogPostSummary[] = [
  {
    _id: "1",
    slug: "best-futons-for-everyday-sleeping",
    title: "Best Futons for Everyday Sleeping",
    excerpt: "A short excerpt about futons.",
    heroImageUrl: "https://static.wixstatic.com/media/img1.jpg",
    firstPublishedDate: new Date("2024-01-15"),
    minutesToRead: 5,
  },
  {
    _id: "2",
    slug: "murphy-bed-guide",
    title: "The Ultimate Murphy Bed Guide",
    excerpt: "Everything you need to know about Murphy beds.",
    heroImageUrl: null,
    firstPublishedDate: new Date("2024-02-10"),
    minutesToRead: 8,
  },
  {
    _id: "3",
    slug: "futon-mattress-types",
    title: "Futon Mattress Types Explained",
    excerpt: "x".repeat(200), // longer than 120 chars — should be truncated
    heroImageUrl: null,
    firstPublishedDate: new Date("2024-03-01"),
    minutesToRead: 4,
  },
];

beforeEach(() => {
  listPostsMock.mockReset();
});

describe("BlogTeasers — renders posts", () => {
  it("renders 3 post cards when listPosts returns 3 posts", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    const cards = screen.getAllByRole("link", { name: /best futons|murphy bed|mattress types/i });
    expect(cards).toHaveLength(3);
  });

  it("renders the section heading 'From the blog'", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    expect(
      screen.getByRole("heading", { name: /from the blog/i }),
    ).toBeInTheDocument();
  });

  it("renders an 'All posts' link to /blog", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    const allLink = screen.getByRole("link", { name: /all posts/i });
    expect(allLink).toHaveAttribute("href", "/blog");
  });

  it("links each card to /blog/[slug]", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    expect(
      screen.getByRole("link", { name: /best futons for everyday sleeping/i }),
    ).toHaveAttribute("href", "/blog/best-futons-for-everyday-sleeping");
  });

  it("renders a cover image when heroImageUrl is present", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    const img = screen.getByAltText("Best Futons for Everyday Sleeping");
    expect(img).toHaveAttribute("src", MOCK_POSTS[0].heroImageUrl!);
  });

  it("renders the CF placeholder when heroImageUrl is null", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    // The placeholder renders "CF" text; no <img> for post 2 or 3
    expect(screen.queryByAltText("The Ultimate Murphy Bed Guide")).toBeNull();
  });
});

describe("BlogTeasers — excerpt truncation", () => {
  it("truncates excerpts longer than 120 chars and appends '…'", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    // MOCK_POSTS[2].excerpt is 200 'x' chars — should be cut to 120 + '…'
    const truncated = screen.getByText(/^x{120}…$/);
    expect(truncated).toBeInTheDocument();
  });

  it("does not truncate excerpts of 120 chars or fewer", async () => {
    listPostsMock.mockResolvedValue(MOCK_POSTS);
    const ui = await BlogTeasers();
    render(ui);
    expect(
      screen.getByText("A short excerpt about futons."),
    ).toBeInTheDocument();
  });
});

describe("BlogTeasers — empty state", () => {
  it("renders nothing when listPosts returns an empty array", async () => {
    listPostsMock.mockResolvedValue([]);
    const ui = await BlogTeasers();
    expect(ui).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...rest} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const listPhotosMock = vi.fn();
vi.mock("@/lib/wix/community-gallery", () => ({
  listCommunityPhotos: (...args: unknown[]) => listPhotosMock(...args),
}));

import CommunityGalleryPage, { metadata } from "@/app/community-gallery/page";

const SEED_PHOTOS = [
  {
    _id: "p1",
    image: "https://static.wixstatic.com/media/futon1.jpg",
    customerName: "Alice T.",
    location: "Asheville, NC",
    productSlug: "mesa-1000",
    caption: "Perfect for my living room",
  },
  {
    _id: "p2",
    image: "https://static.wixstatic.com/media/futon2.jpg",
    customerName: "Bob R.",
    location: "Charlotte, NC",
    productSlug: "olympus-full",
    caption: "Converts in seconds",
  },
  {
    _id: "p3",
    image: "https://static.wixstatic.com/media/futon3.jpg",
    customerName: "Carol S.",
    location: "Hendersonville, NC",
    productSlug: "",
    caption: "",
  },
];

beforeEach(() => {
  listPhotosMock.mockReset();
  listPhotosMock.mockResolvedValue({ photos: SEED_PHOTOS });
});

describe("CommunityGalleryPage — metadata", () => {
  it("exports a title containing 'Community Gallery'", () => {
    expect(metadata.title).toMatch(/Community Gallery/i);
  });

  it("exports a non-empty description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(10);
  });
});

describe("CommunityGalleryPage — render", () => {
  it("renders the h1 heading", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a grid when photos are returned", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.getByTestId("community-gallery-grid")).toBeInTheDocument();
  });

  it("renders one img per photo", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.getAllByRole("img")).toHaveLength(SEED_PHOTOS.length);
  });

  it("each image src matches the photo URL", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    const srcs = screen.getAllByRole("img").map((img) => img.getAttribute("src"));
    for (const photo of SEED_PHOTOS) {
      expect(srcs).toContain(photo.image);
    }
  });

  it("links photo with a productSlug to /products/{slug}", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    const slugs = screen
      .getAllByTestId("product-link")
      .map((l) => l.getAttribute("href"));
    expect(slugs).toContain("/products/mesa-1000");
    expect(slugs).toContain("/products/olympus-full");
  });

  it("photo without productSlug has no product link", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    // p1 + p2 have slugs; p3 does not
    expect(screen.getAllByTestId("product-link")).toHaveLength(2);
  });
});

describe("CommunityGalleryPage — empty state", () => {
  it("shows the empty-state message when no photos are returned", async () => {
    listPhotosMock.mockResolvedValueOnce({ photos: [] });
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.queryByTestId("community-gallery-grid")).not.toBeInTheDocument();
    expect(screen.getByText(/photos coming soon/i)).toBeInTheDocument();
  });
});

describe("CommunityGalleryPage — error state", () => {
  it("shows error message (not empty-state copy) when lib returns error", async () => {
    listPhotosMock.mockResolvedValueOnce({ photos: [], error: "wix_sdk" });
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.queryByTestId("community-gallery-grid")).not.toBeInTheDocument();
    expect(screen.queryByText(/photos coming soon/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("gallery-error")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("h1 still renders even when lib returns error", async () => {
    listPhotosMock.mockResolvedValueOnce({ photos: [], error: "wix_sdk" });
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("CommunityGalleryPage — lib integration", () => {
  it("calls listCommunityPhotos on render", async () => {
    const ui = await CommunityGalleryPage();
    render(ui);
    expect(listPhotosMock).toHaveBeenCalledTimes(1);
  });
});

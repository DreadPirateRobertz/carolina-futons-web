/**
 * cf-xbj9: dark mode bg-white card wrappers — regression guard.
 *
 * Pattern mirrors PLPDarkMode.test.tsx: render each component, querySelector
 * the card wrapper, assert dark:bg-cf-cream is present. Without these tests a
 * merge conflict or class-string refactor silently re-introduces the 1.16:1
 * contrast failures caught by the cf-tu3q audit.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// ── Shared stubs ───────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── ConsentBanner ──────────────────────────────────────────────────────────────

vi.mock("@/app/actions/consent", () => ({
  setConsentChoice: vi.fn().mockResolvedValue({ ok: true }),
}));

import { ConsentBanner } from "@/components/analytics/ConsentBanner";

describe("ConsentBanner — dark mode (cf-xbj9)", () => {
  it("card carries dark:bg-cf-cream", () => {
    // Pass initialChoice="unknown" + mounted flag via prop; banner renders after useEffect.
    const { container } = render(<ConsentBanner initialChoice="unknown" />);
    // Query by aria-label since data-slot relies on post-mount state
    const banner = container.querySelector("[aria-label='Privacy preferences']");
    expect(banner?.className).toContain("dark:bg-cf-cream");
  });
});

// ── VideoGallery ───────────────────────────────────────────────────────────────

import { VideoGallery } from "@/components/videos/VideoGallery";
import type { VideoEntry } from "@/lib/videos/catalog";

const VIDEO_FIXTURE: VideoEntry[] = [
  {
    id: "v1",
    title: "Asheville",
    description: "A futon",
    category: "futon",
    source: "wix",
    videoUrl: "https://video.wixstatic.com/a.mp4",
    posterUrl: "https://static.wixstatic.com/a.jpg",
    productSlug: "asheville",
    sortOrder: 1,
  },
];

describe("VideoGallery — dark mode (cf-xbj9)", () => {
  it("video article card carries dark:bg-cf-cream", () => {
    const { container } = render(
      <VideoGallery videos={VIDEO_FIXTURE} onPlay={vi.fn()} />,
    );
    const article = container.querySelector("article");
    expect(article?.className).toContain("dark:bg-cf-cream");
  });
});

// ── HeroCarousel ───────────────────────────────────────────────────────────────

import { HeroCarousel } from "@/components/site/HeroCarousel";

const SLIDES = [
  { src: "/a.jpg", alt: "Slide A" },
  { src: "/b.jpg", alt: "Slide B" },
];

describe("HeroCarousel — dark mode (cf-xbj9)", () => {
  it("carousel wrapper carries dark:bg-cf-cream", () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />);
    const wrapper = container.querySelector("[class*='aspect-']");
    expect(wrapper?.className).toContain("dark:bg-cf-cream");
  });
});

// ── ProductInfoModal ───────────────────────────────────────────────────────────

vi.mock("@/lib/wix/products", () => ({
  getProductBySlug: vi.fn().mockResolvedValue(null),
}));

import { ProductInfoModal } from "@/components/product/ProductInfoModal";

describe("ProductInfoModal — dark mode (cf-xbj9)", () => {
  it("dialog carries dark:bg-cf-cream", () => {
    const { container } = render(
      <ProductInfoModal productSlug="test" triggerLabel="Info" />,
    );
    const dialog = container.querySelector("dialog");
    expect(dialog?.className).toContain("dark:bg-cf-cream");
  });
});

// ── RegistryDashboard ──────────────────────────────────────────────────────────

vi.mock("@/app/actions/registry", () => ({
  getMyRegistriesAction: vi.fn().mockResolvedValue({ success: true, registries: [] }),
  deleteRegistryAction: vi.fn().mockResolvedValue({ success: true }),
  createRegistryAction: vi.fn().mockResolvedValue({ success: true, slug: "r1" }),
}));

vi.mock("@/components/registry/CreateRegistryForm", () => ({
  CreateRegistryForm: () => <div data-testid="create-form-stub" />,
}));

import { RegistryDashboard } from "@/components/registry/RegistryDashboard";
import type { RegistrySummary } from "@/lib/registry/registry-types";

const REGISTRY_FIXTURE: RegistrySummary[] = [
  {
    _id: "r1",
    name: "Our Wedding",
    occasion: "Wedding" as never,
    eventDate: "2026-06-01",
    slug: "our-wedding",
    isPublic: true,
  },
];

describe("RegistryDashboard — dark mode (cf-xbj9)", () => {
  it("registry list card carries dark:bg-cf-cream", () => {
    const { container } = render(
      <RegistryDashboard initialRegistries={REGISTRY_FIXTURE} />,
    );
    const card = container.querySelector("li.rounded-lg");
    expect(card?.className).toContain("dark:bg-cf-cream");
  });
});

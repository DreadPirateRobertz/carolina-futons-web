import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// cfw-6qd.6: server-component wrapper. Tests pin the four-branch matrix
// the spec calls out (owner × wix-media-resolves) plus the customer-mode
// markup-parity guarantee — non-owner output must be a single <Image>
// with no editable wrapper, no replacer JS, no data-editable-image attr.

vi.mock("server-only", () => ({}));

const mockGetSiteContent = vi.fn(async (_key: string, fallback = "") => fallback);
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (key: string, fallback?: string) =>
    mockGetSiteContent(key, fallback ?? ""),
}));

const mockGetOwnerSession = vi.fn();
vi.mock("@/lib/auth/owner", () => ({
  getOwnerSession: () => mockGetOwnerSession(),
}));

vi.mock("@/components/admin/EditableImageReplacer", () => ({
  EditableImageReplacer: ({
    contentKey,
    currentValue,
    alt,
  }: {
    contentKey: string;
    currentValue: string;
    alt: string;
  }) => (
    <button
      type="button"
      data-testid="mock-replacer"
      data-key={contentKey}
      data-current={currentValue}
      data-alt={alt}
    >
      mock replacer
    </button>
  ),
}));

// next/image is server-rendered to a plain <img>; jsdom can't fully exercise
// it, so stub to a minimal img that preserves the relevant attributes.
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    priority,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    className?: string;
  }) => (
     
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      data-priority={priority ? "1" : undefined}
      className={className}
      data-testid="mock-image"
    />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSiteContent.mockImplementation(
    async (_key: string, fallback = "") => fallback,
  );
  mockGetOwnerSession.mockResolvedValue(null);
});

describe("EditableImage — customer mode", () => {
  it("renders a single <Image> with no editable wrapper or replacer", async () => {
    const { EditableImage } = await import("@/components/admin/EditableImage");
    const { container } = render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero-default.jpg",
        alt: "Bear in the Blue Ridge mountains",
        width: 1920,
        height: 800,
      }),
    );
    const img = screen.getByTestId("mock-image");
    expect(img).toHaveAttribute("alt", "Bear in the Blue Ridge mountains");
    expect(img).toHaveAttribute("width", "1920");
    expect(img).toHaveAttribute("height", "800");
    expect(screen.queryByTestId("mock-replacer")).toBeNull();
    expect(container.querySelector("[data-editable-image]")).toBeNull();
  });

  it("uses fallbackSrc when SiteContent has no row", async () => {
    mockGetSiteContent.mockResolvedValueOnce("");
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "missing.key",
        fallbackSrc: "/brand/hero-default.jpg",
        alt: "fallback",
      }),
    );
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "/brand/hero-default.jpg",
    );
  });

  it("uses the resolved CDN URL when SiteContent holds a Wix Media reference", async () => {
    mockGetSiteContent.mockResolvedValueOnce(
      "wix:image://v1/abc.jpg/hero.jpg#originWidth=1920&originHeight=800",
    );
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero-default.jpg",
        alt: "hero",
      }),
    );
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_1920,h_800/hero.jpg",
    );
  });

  it("falls back when the SiteContent value is unresolvable (e.g. malformed)", async () => {
    mockGetSiteContent.mockResolvedValueOnce("not-a-wix-url");
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero-default.jpg",
        alt: "hero",
      }),
    );
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "/brand/hero-default.jpg",
    );
  });

  it("forwards priority=true through to next/image", async () => {
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero.jpg",
        alt: "hero",
        priority: true,
      }),
    );
    expect(screen.getByTestId("mock-image")).toHaveAttribute("data-priority", "1");
  });
});

describe("EditableImage — owner mode", () => {
  beforeEach(() => {
    mockGetOwnerSession.mockResolvedValue({
      email: "brenda@carolinafutons.com",
      memberId: "member-owner",
      accessToken: "tok",
      tokens: {},
    });
  });

  it("wraps the image and renders the replacer", async () => {
    mockGetSiteContent.mockResolvedValueOnce(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_1920,h_800/hero.jpg",
    );
    const { EditableImage } = await import("@/components/admin/EditableImage");
    const { container } = render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero.jpg",
        alt: "hero",
      }),
    );
    const wrapper = container.querySelector("[data-editable-image]");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("data-editable-image")).toBe("hero.image");
    expect(wrapper?.getAttribute("data-owner-mode")).toBe("1");
    expect(screen.getByTestId("mock-image")).toBeInTheDocument();
    expect(screen.getByTestId("mock-replacer")).toBeInTheDocument();
  });

  it("passes contentKey + currentValue + alt through to the replacer", async () => {
    mockGetSiteContent.mockResolvedValueOnce("wix:image://v1/abc.jpg/hero.jpg");
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero.jpg",
        alt: "Bear in the Blue Ridge mountains",
      }),
    );
    const replacer = screen.getByTestId("mock-replacer");
    expect(replacer.getAttribute("data-key")).toBe("hero.image");
    expect(replacer.getAttribute("data-current")).toBe("wix:image://v1/abc.jpg/hero.jpg");
    expect(replacer.getAttribute("data-alt")).toBe("Bear in the Blue Ridge mountains");
  });

  it("still shows the replacer when SiteContent is empty (Brenda's first upload)", async () => {
    mockGetSiteContent.mockResolvedValueOnce("");
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero.jpg",
        alt: "hero",
      }),
    );
    expect(screen.getByTestId("mock-replacer")).toBeInTheDocument();
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "/brand/hero.jpg",
    );
  });

  it("still shows the replacer when the SiteContent value can't resolve", async () => {
    mockGetSiteContent.mockResolvedValueOnce("garbage");
    const { EditableImage } = await import("@/components/admin/EditableImage");
    render(
      await EditableImage({
        contentKey: "hero.image",
        fallbackSrc: "/brand/hero.jpg",
        alt: "hero",
      }),
    );
    expect(screen.getByTestId("mock-replacer")).toBeInTheDocument();
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "/brand/hero.jpg",
    );
  });
});

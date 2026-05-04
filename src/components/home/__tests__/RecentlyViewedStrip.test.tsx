import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-l6aj.8.1: RecentlyViewedStrip unit tests.
// Reads the same localStorage LRU as ContinueShoppingStrip but caps display
// at 4 items and renders below FilterFirst. Tests cover: null-when-empty,
// renders-with-items, 4-item cap, tab-sync via storage event, SSR snapshot.

import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/product/recently-viewed";

type RV = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  priceText?: string;
  viewedAt: number;
};

function makeItem(overrides: Partial<RV> = {}): RV {
  return {
    id: "prod-1",
    slug: "test-futon",
    name: "Test Futon",
    viewedAt: Date.now(),
    ...overrides,
  };
}

function setLRU(items: RV[]) {
  localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
}

const mocks = vi.hoisted(() => ({
  useServerSnapshot: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useSyncExternalStore: (
      subscribe: Parameters<typeof actual.useSyncExternalStore>[0],
      getSnapshot: Parameters<typeof actual.useSyncExternalStore>[1],
      getServerSnapshot?: Parameters<typeof actual.useSyncExternalStore>[2],
    ) => {
      if (mocks.useServerSnapshot) {
        return (getServerSnapshot ?? (() => []))();
      }
      return actual.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

import { RecentlyViewedStrip } from "@/components/home/RecentlyViewedStrip";

beforeEach(() => {
  localStorage.clear();
  mocks.useServerSnapshot = false;
});

describe("RecentlyViewedStrip — null when empty", () => {
  it("renders nothing when localStorage has no recently-viewed key", () => {
    const { container } = render(<RecentlyViewedStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the stored array is empty", () => {
    setLRU([]);
    const { container } = render(<RecentlyViewedStrip />);
    expect(container.firstChild).toBeNull();
  });
});

describe("RecentlyViewedStrip — renders with items", () => {
  it("renders the strip section when LRU has at least one entry", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    render(<RecentlyViewedStrip />);
    expect(
      screen.getByRole("region", { name: /recently viewed/i }),
    ).toBeInTheDocument();
  });

  it("renders one tile per item", () => {
    setLRU([
      makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" }),
      makeItem({ id: "2", slug: "futon-b", name: "Futon B" }),
    ]);
    render(<RecentlyViewedStrip />);
    expect(screen.getByText("Sofa A")).toBeInTheDocument();
    expect(screen.getByText("Futon B")).toBeInTheDocument();
  });

  it("renders priceText when present", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A", priceText: "$399.00" })]);
    render(<RecentlyViewedStrip />);
    expect(screen.getByText("$399.00")).toBeInTheDocument();
  });

  it("renders an image when imageUrl is present", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A", imageUrl: "https://cdn/img.jpg" })]);
    render(<RecentlyViewedStrip />);
    expect(screen.getByAltText("Sofa A")).toHaveAttribute("src", "https://cdn/img.jpg");
  });
});

describe("RecentlyViewedStrip — 4-item display cap", () => {
  it("shows at most 4 items even when LRU has 6", () => {
    setLRU([
      makeItem({ id: "1", slug: "a", name: "Item A" }),
      makeItem({ id: "2", slug: "b", name: "Item B" }),
      makeItem({ id: "3", slug: "c", name: "Item C" }),
      makeItem({ id: "4", slug: "d", name: "Item D" }),
      makeItem({ id: "5", slug: "e", name: "Item E" }),
      makeItem({ id: "6", slug: "f", name: "Item F" }),
    ]);
    render(<RecentlyViewedStrip />);
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item D")).toBeInTheDocument();
    expect(screen.queryByText("Item E")).toBeNull();
    expect(screen.queryByText("Item F")).toBeNull();
  });
});

describe("RecentlyViewedStrip — correct hrefs", () => {
  it("each tile link points to /products/<slug>", () => {
    setLRU([
      makeItem({ id: "1", slug: "asheville-futon", name: "Asheville Futon" }),
      makeItem({ id: "2", slug: "kingston-bed", name: "Kingston Bed" }),
    ]);
    render(<RecentlyViewedStrip />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/products/asheville-futon");
    expect(hrefs).toContain("/products/kingston-bed");
  });
});

describe("RecentlyViewedStrip — SSR server snapshot", () => {
  it("renders nothing when useSyncExternalStore uses getServerSnapshot (SSR path)", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    mocks.useServerSnapshot = true;
    const { container } = render(<RecentlyViewedStrip />);
    expect(container.firstChild).toBeNull();
  });
});

describe("RecentlyViewedStrip — tab-sync via storage event", () => {
  it("adds new items when a storage event fires with the LRU key", async () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    render(<RecentlyViewedStrip />);
    expect(screen.getByText("Sofa A")).toBeInTheDocument();
    expect(screen.queryByText("Futon B")).toBeNull();

    setLRU([
      makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" }),
      makeItem({ id: "2", slug: "futon-b", name: "Futon B" }),
    ]);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: RECENTLY_VIEWED_STORAGE_KEY }),
      );
    });

    expect(screen.getByText("Futon B")).toBeInTheDocument();
  });

  it("does not re-render when a storage event fires for an unrelated key", async () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    render(<RecentlyViewedStrip />);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "some-other-key" }),
      );
    });

    expect(screen.getByText("Sofa A")).toBeInTheDocument();
  });
});

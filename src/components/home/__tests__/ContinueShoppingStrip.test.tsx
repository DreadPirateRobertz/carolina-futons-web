import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-l6aj.7.1: ContinueShoppingStrip unit tests.
// The component uses useSyncExternalStore to read from localStorage (LRU of
// recently-viewed PDPs). Tests cover: null-when-empty, renders-with-items,
// tab-sync via storage event, SSR server-snapshot, correct tile hrefs.

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

// useServerSnapshot flag — lets the SSR test force the server code path.
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

import { ContinueShoppingStrip } from "@/components/home/ContinueShoppingStrip";

beforeEach(() => {
  localStorage.clear();
  mocks.useServerSnapshot = false;
});

describe("ContinueShoppingStrip — null when empty", () => {
  it("renders nothing when localStorage has no recently-viewed key", () => {
    const { container } = render(<ContinueShoppingStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the stored array is empty", () => {
    setLRU([]);
    const { container } = render(<ContinueShoppingStrip />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ContinueShoppingStrip — renders with items", () => {
  it("renders the strip section when LRU has at least one entry", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    render(<ContinueShoppingStrip />);
    expect(
      screen.getByRole("region", { name: /continue shopping/i }),
    ).toBeInTheDocument();
  });

  it("renders one tile per item", () => {
    setLRU([
      makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" }),
      makeItem({ id: "2", slug: "futon-b", name: "Futon B" }),
    ]);
    render(<ContinueShoppingStrip />);
    expect(screen.getByText("Sofa A")).toBeInTheDocument();
    expect(screen.getByText("Futon B")).toBeInTheDocument();
  });

  it("renders priceText when present", () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A", priceText: "$399.00" })]);
    render(<ContinueShoppingStrip />);
    expect(screen.getByText("$399.00")).toBeInTheDocument();
  });
});

describe("ContinueShoppingStrip — correct hrefs", () => {
  it("each tile link points to /products/<slug>", () => {
    setLRU([
      makeItem({ id: "1", slug: "asheville-futon", name: "Asheville Futon" }),
      makeItem({ id: "2", slug: "kingston-bed", name: "Kingston Bed" }),
    ]);
    render(<ContinueShoppingStrip />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/products/asheville-futon");
    expect(hrefs).toContain("/products/kingston-bed");
  });
});

describe("ContinueShoppingStrip — SSR server snapshot", () => {
  it("renders nothing when useSyncExternalStore uses getServerSnapshot (SSR path)", () => {
    // Even with localStorage populated, getServerSnapshot always returns [].
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    mocks.useServerSnapshot = true;
    const { container } = render(<ContinueShoppingStrip />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ContinueShoppingStrip — tab-sync via storage event", () => {
  it("adds new items when a storage event fires with the LRU key", async () => {
    setLRU([makeItem({ id: "1", slug: "sofa-a", name: "Sofa A" })]);
    render(<ContinueShoppingStrip />);
    expect(screen.getByText("Sofa A")).toBeInTheDocument();
    expect(screen.queryByText("Futon B")).toBeNull();

    // Simulate another tab writing a new item to localStorage.
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
    render(<ContinueShoppingStrip />);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "some-other-key" }),
      );
    });

    // Strip still shows original item — no spurious re-render from wrong key.
    expect(screen.getByText("Sofa A")).toBeInTheDocument();
  });
});

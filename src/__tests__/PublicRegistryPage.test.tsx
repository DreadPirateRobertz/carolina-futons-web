import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetPublicRegistryAction = vi.fn();
vi.mock("@/app/actions/registry", () => ({
  getPublicRegistryAction: (...a: unknown[]) => mockGetPublicRegistryAction(...a),
  markItemPurchasedAction: vi.fn().mockResolvedValue({ success: true }),
}));

import PublicRegistryPage from "@/app/registry/[slug]/page";

const FIXTURE_REGISTRY = {
  _id: "r1",
  title: "Our Wedding Registry",
  slug: "our-wedding-registry-abc123",
  occasion: "wedding" as const,
  eventDate: "2026-09-15",
  message: "Join us as we start our new chapter!",
  isPublic: true,
  items: [
    {
      _id: "i1",
      productName: "Monterey Futon Frame",
      productSlug: "monterey-futon-frame",
      productPrice: 899,
      quantity: 1,
      purchasedQuantity: 0,
      remaining: 1,
      imageUrl: null,
      notes: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicRegistryPage — not-found branch", () => {
  it("renders not-found UI when action returns failure", async () => {
    mockGetPublicRegistryAction.mockResolvedValue({ success: false, error: "Not found" });
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "missing" }) });
    render(ui);
    expect(screen.getByTestId("registry-not-found")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /registry not found/i })).toBeTruthy();
  });
});

describe("PublicRegistryPage — happy path", () => {
  beforeEach(() => {
    mockGetPublicRegistryAction.mockResolvedValue({ success: true, registry: FIXTURE_REGISTRY });
  });

  it("renders the registry title", async () => {
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByRole("heading", { name: /our wedding registry/i })).toBeTruthy();
  });

  it("renders the occasion label with event date", async () => {
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByText(/Wedding · /)).toBeTruthy();
  });

  it("renders the registry message", async () => {
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByText(/join us as we start our new chapter/i)).toBeTruthy();
  });

  it("renders the item list", async () => {
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByTestId("registry-items")).toBeTruthy();
    expect(screen.getByTestId("registry-item")).toBeTruthy();
    expect(screen.getByText("Monterey Futon Frame")).toBeTruthy();
  });

  it("shows remaining count for item", async () => {
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByText(/1 of 1 still needed/i)).toBeTruthy();
  });
});

describe("PublicRegistryPage — empty items", () => {
  it("shows empty message when registry has no items", async () => {
    mockGetPublicRegistryAction.mockResolvedValue({
      success: true,
      registry: { ...FIXTURE_REGISTRY, items: [] },
    });
    const ui = await PublicRegistryPage({ params: Promise.resolve({ slug: "our-wedding-registry-abc123" }) });
    render(ui);
    expect(screen.getByText(/no items added to this registry yet/i)).toBeTruthy();
  });
});

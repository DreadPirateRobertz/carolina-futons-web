import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryChain = {
  eq: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
};

function makeChain(items: unknown[]): QueryChain {
  const chain: QueryChain = {
    eq: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    find: vi.fn(async () => ({ items })),
  };
  return chain;
}

function mockClient(items: unknown[]) {
  const chain = makeChain(items);
  return {
    client: { items: { query: vi.fn(() => chain) } },
    chain,
  };
}

beforeEach(() => {
  vi.resetModules();
});

describe("cf3qt typed reads", () => {
  it("getLandingBySlug returns a single Landing or null", async () => {
    const { client } = mockClient([
      { _id: "1", slug: "spring-sale", title: "Spring", headline: "Sale!" },
    ]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    const { getLandingBySlug } = await import("@/lib/wix/cf3qt");
    const row = await getLandingBySlug("spring-sale");
    expect(row?.slug).toBe("spring-sale");
    expect(client.items.query).toHaveBeenCalledWith("Landings");
  });

  it("listPressMentions passes PressMentions collection + limit", async () => {
    const { client, chain } = mockClient([
      { _id: "a", outlet: "SL", articleTitle: "x", articleUrl: "u", publishedDate: "d" },
    ]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    const { listPressMentions } = await import("@/lib/wix/cf3qt");
    const rows = await listPressMentions(25);
    expect(rows).toHaveLength(1);
    expect(client.items.query).toHaveBeenCalledWith("PressMentions");
    expect(chain.limit).toHaveBeenCalledWith(25);
  });

  it("listFeaturedPressMentions filters on featured=true", async () => {
    const { client, chain } = mockClient([]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    const { listFeaturedPressMentions } = await import("@/lib/wix/cf3qt");
    await listFeaturedPressMentions(5);
    expect(chain.eq).toHaveBeenCalledWith("featured", true);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it("listPressKitAssets targets PressKitAssets", async () => {
    const { client } = mockClient([
      { _id: "k", name: "Logo", fileUrl: "u" },
    ]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    const { listPressKitAssets } = await import("@/lib/wix/cf3qt");
    await listPressKitAssets();
    expect(client.items.query).toHaveBeenCalledWith("PressKitAssets");
  });

  it("listComparisonFeatures targets ComparisonFeatures with default limit", async () => {
    const { client, chain } = mockClient([]);
    vi.doMock("@/lib/wix-client", () => ({ getWixClient: () => client }));
    const { listComparisonFeatures } = await import("@/lib/wix/cf3qt");
    await listComparisonFeatures();
    expect(client.items.query).toHaveBeenCalledWith("ComparisonFeatures");
    expect(chain.limit).toHaveBeenCalledWith(100);
  });
});

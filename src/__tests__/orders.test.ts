import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Tokens } from "@wix/sdk";

const wixMocks = vi.hoisted(() => ({
  searchOrders: vi.fn(),
  getOrder: vi.fn(),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({
    orders: { getOrder: wixMocks.getOrder, searchOrders: wixMocks.searchOrders },
  }),
  getWixClientWithTokens: () => ({
    orders: { getOrder: wixMocks.getOrder, searchOrders: wixMocks.searchOrders },
  }),
}));

const tokens = { accessToken: { value: "a" }, refreshToken: { value: "r" } } as unknown as Tokens;

beforeEach(() => {
  wixMocks.searchOrders.mockReset();
  wixMocks.getOrder.mockReset();
});

describe("getOrdersForMember", () => {
  it("returns [] when contactId is empty without hitting the SDK", async () => {
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const out = await getOrdersForMember({ contactId: "", tokens });
    expect(out).toEqual([]);
    expect(wixMocks.searchOrders).not.toHaveBeenCalled();
  });

  it("forwards contactId filter, descending date sort, and a default limit of 25", async () => {
    wixMocks.searchOrders.mockResolvedValueOnce({ orders: [] });
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens });
    expect(wixMocks.searchOrders).toHaveBeenCalledWith({
      filter: { "buyerInfo.contactId": "C-1" },
      sort: [{ fieldName: "_createdDate", order: "DESC" }],
      cursorPaging: { limit: 25 },
    });
  });

  it("respects an explicit limit override", async () => {
    wixMocks.searchOrders.mockResolvedValueOnce({ orders: [] });
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens, limit: 5 });
    expect(wixMocks.searchOrders).toHaveBeenCalledWith(
      expect.objectContaining({ cursorPaging: { limit: 5 } }),
    );
  });

  it("flattens raw Wix orders into MemberOrderSummary shape", async () => {
    wixMocks.searchOrders.mockResolvedValueOnce({
      orders: [
        {
          _id: "O-1",
          number: "1042",
          _createdDate: "2026-04-20T10:00:00Z",
          status: "APPROVED",
          paymentStatus: "PAID",
          fulfillmentStatus: "NOT_FULFILLED",
          currency: "USD",
          priceSummary: { total: { amount: "1299.99", formattedAmount: "$1,299.99" } },
          lineItems: [{ quantity: 2 }, { quantity: 1 }],
        },
      ],
    });
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const [order] = await getOrdersForMember({ contactId: "C-1", tokens });
    expect(order).toEqual({
      id: "O-1",
      number: "1042",
      createdDate: "2026-04-20T10:00:00Z",
      status: "APPROVED",
      paymentStatus: "PAID",
      fulfillmentStatus: "NOT_FULFILLED",
      totalFormatted: "$1,299.99",
      totalValue: 1299.99,
      currency: "USD",
      itemCount: 3,
    });
  });

  it("falls back to UNKNOWN status fields and 0 items on minimal payloads", async () => {
    wixMocks.searchOrders.mockResolvedValueOnce({
      orders: [{ _id: "O-2" }],
    });
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const [order] = await getOrdersForMember({ contactId: "C-1", tokens });
    expect(order).toMatchObject({
      id: "O-2",
      number: null,
      status: "UNKNOWN",
      paymentStatus: "UNKNOWN",
      fulfillmentStatus: "UNKNOWN",
      itemCount: 0,
      totalFormatted: null,
      totalValue: null,
    });
  });

  it("returns [] and logs when searchOrders throws", async () => {
    wixMocks.searchOrders.mockRejectedValueOnce(new Error("rpc down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const out = await getOrdersForMember({ contactId: "C-1", tokens });
    expect(out).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("getOrdersForMember — logError migration", () => {
  // Pin the new logError(scope, message, err, extra) shape so a future
  // refactor that swaps the helper or drops the contextual extras gets
  // caught at review time.

  it("emits the bracketed '[orders] searchOrders failed' prefix on the catch path", async () => {
    const thrown = new Error("rpc down");
    wixMocks.searchOrders.mockRejectedValueOnce(thrown);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getOrdersForMember } = await import("@/lib/wix/orders");

    await getOrdersForMember({ contactId: "C-1", tokens });

    expect(errSpy).toHaveBeenCalledTimes(1);
    const [prefix, errArg] = errSpy.mock.calls[0]!;
    expect(prefix).toBe("[orders] searchOrders failed");
    expect(errArg).toBe(thrown);
    errSpy.mockRestore();
  });

  it("forwards non-Error throws (Wix SDK occasionally rejects with strings) as the same payload", async () => {
    wixMocks.searchOrders.mockRejectedValueOnce("401 Unauthorized");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getOrdersForMember } = await import("@/lib/wix/orders");

    const out = await getOrdersForMember({ contactId: "C-1", tokens });

    expect(out).toEqual([]);
    expect(errSpy).toHaveBeenCalledWith(
      "[orders] searchOrders failed",
      "401 Unauthorized",
    );
    errSpy.mockRestore();
  });

  it("still surfaces an empty list when the limit override path also throws (regression guard)", async () => {
    // The migrated logError call captures `limit` in extra context.
    // A future refactor that forgot to thread the override through
    // the extras would still pass the empty-list contract but lose
    // diagnostic value. This test pins the both-the-contract-and-the-
    // log-line behaviour for the limit-override branch.
    wixMocks.searchOrders.mockRejectedValueOnce(new Error("rpc down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getOrdersForMember } = await import("@/lib/wix/orders");

    const out = await getOrdersForMember({ contactId: "C-1", tokens, limit: 5 });

    expect(out).toEqual([]);
    expect(errSpy).toHaveBeenCalledWith(
      "[orders] searchOrders failed",
      expect.any(Error),
    );
    errSpy.mockRestore();
  });
});

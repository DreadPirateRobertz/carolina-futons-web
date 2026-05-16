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

// cfw-logger migration: searchOrders catch routes through logError.
const logErrorMock = vi.fn();
vi.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

const tokens = { accessToken: { value: "a" }, refreshToken: { value: "r" } } as unknown as Tokens;

beforeEach(() => {
  wixMocks.searchOrders.mockReset();
  wixMocks.getOrder.mockReset();
  logErrorMock.mockReset();
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
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const out = await getOrdersForMember({ contactId: "C-1", tokens });
    expect(out).toEqual([]);
    // Observability now routes through logError (cfw-logger migration).
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// cfw-logger migration: searchOrders catch routes through
// logError("orders", "searchOrders failed", err). Pin the contract.
describe("getOrdersForMember — logError observability", () => {
  it("calls logError when searchOrders throws", async () => {
    wixMocks.searchOrders.mockRejectedValueOnce(new Error("rpc down"));
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens });
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("tags logError with scope='orders' and message='searchOrders failed'", async () => {
    wixMocks.searchOrders.mockRejectedValueOnce(new Error("rpc down"));
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens });
    expect(logErrorMock).toHaveBeenCalledWith(
      "orders",
      "searchOrders failed",
      expect.anything(),
    );
  });

  it("passes the caught Error instance directly to logError (preserves stack)", async () => {
    const err = new Error("rpc down");
    wixMocks.searchOrders.mockRejectedValueOnce(err);
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens });
    const [, , payload] = logErrorMock.mock.calls[0]!;
    expect(payload).toBe(err);
  });
});

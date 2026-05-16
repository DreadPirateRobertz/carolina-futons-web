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

// cfw-5k11: getOrdersForMember catch now routes through logError →
// Sentry. Mock @sentry/nextjs so the runner doesn't ship events AND
// the new logError-integration describe below can assert on the
// (scope, op) tag pair + contactId extra.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
  flush: sentryMocks.flush,
}));

const tokens = { accessToken: { value: "a" }, refreshToken: { value: "r" } } as unknown as Tokens;

beforeEach(() => {
  wixMocks.searchOrders.mockReset();
  wixMocks.getOrder.mockReset();
  sentryMocks.captureException.mockReset();
  sentryMocks.flush.mockReset().mockResolvedValue(true);
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

// cfw-5k11: pin logError integration on the getOrdersForMember catch.
// A silent searchOrders outage previously rendered the dashboard with
// "no orders" (empty state) and no operational signal — exactly the
// kind of P1 ops gap a member-reported ticket might miss.
describe("getOrdersForMember — logError integration", () => {
  it("captures with scope='orders' + op='searchOrders failed' + extra { contactId } + flush(2000)", async () => {
    const err = new Error("rpc down");
    wixMocks.searchOrders.mockRejectedValueOnce(err);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getOrdersForMember } = await import("@/lib/wix/orders");
    const out = await getOrdersForMember({ contactId: "C-42", tokens });

    expect(out).toEqual([]);
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    const [reportedErr, opts] = sentryMocks.captureException.mock.calls[0]!;
    expect(reportedErr).toBe(err);
    expect((opts as { tags: Record<string, string> }).tags).toEqual({
      scope: "orders",
      op: "searchOrders failed",
    });
    expect((opts as { level: string }).level).toBe("error");
    expect((opts as { extra: Record<string, unknown> }).extra).toEqual({
      contactId: "C-42",
    });
    expect(sentryMocks.flush).toHaveBeenCalledWith(2000);
    errSpy.mockRestore();
  });

  it("happy path (searchOrders resolves) does NOT call Sentry", async () => {
    wixMocks.searchOrders.mockResolvedValueOnce({ orders: [] });

    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "C-1", tokens });

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.flush).not.toHaveBeenCalled();
  });

  it("empty-contactId early-return does NOT call Sentry — short-circuit before SDK", async () => {
    const { getOrdersForMember } = await import("@/lib/wix/orders");
    await getOrdersForMember({ contactId: "", tokens });

    expect(wixMocks.searchOrders).not.toHaveBeenCalled();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});

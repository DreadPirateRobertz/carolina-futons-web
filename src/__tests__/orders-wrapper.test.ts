import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderRpc = vi.fn();

vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({
    orders: { getOrder: (...args: unknown[]) => getOrderRpc(...args) },
  }),
}));

describe("getOrder wrapper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns null for empty orderId without calling the client", async () => {
    const { getOrder } = await import("@/lib/wix/orders");
    const result = await getOrder("");
    expect(result).toBeNull();
    expect(getOrderRpc).not.toHaveBeenCalled();
  });

  it("returns the order on success", async () => {
    getOrderRpc.mockResolvedValueOnce({ _id: "o1", number: "1042" });
    const { getOrder } = await import("@/lib/wix/orders");
    const result = await getOrder("o1");
    expect(result).toEqual({ _id: "o1", number: "1042" });
  });

  it("treats NOT_FOUND applicationError as null", async () => {
    getOrderRpc.mockRejectedValueOnce({
      details: { applicationError: { code: "NOT_FOUND" } },
    });
    const { getOrder } = await import("@/lib/wix/orders");
    expect(await getOrder("missing")).toBeNull();
  });

  it("treats 404 status as null", async () => {
    getOrderRpc.mockRejectedValueOnce({ status: 404 });
    const { getOrder } = await import("@/lib/wix/orders");
    expect(await getOrder("missing")).toBeNull();
  });

  it("rethrows unexpected errors", async () => {
    getOrderRpc.mockRejectedValueOnce(new Error("boom"));
    const { getOrder } = await import("@/lib/wix/orders");
    await expect(getOrder("o1")).rejects.toThrow("boom");
  });
});

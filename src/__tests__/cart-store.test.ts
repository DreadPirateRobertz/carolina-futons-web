import { describe, it, expect, vi, beforeEach } from "vitest";

const addItemAction = vi.fn();
const removeItemAction = vi.fn();
const updateQuantityAction = vi.fn();
const getCartAction = vi.fn();

vi.mock("@/app/actions/cart", () => ({
  addItemAction: (...args: unknown[]) => addItemAction(...args),
  removeItemAction: (...args: unknown[]) => removeItemAction(...args),
  updateQuantityAction: (...args: unknown[]) => updateQuantityAction(...args),
  getCartAction: (...args: unknown[]) => getCartAction(...args),
}));

function freshStore() {
  vi.resetModules();
  return import("@/lib/cart/store");
}

describe("useCartStore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hydrate loads cart from server", async () => {
    getCartAction.mockResolvedValueOnce({
      ok: true,
      cart: { _id: "c1", lineItems: [] },
    });
    const { useCartStore } = await freshStore();
    await useCartStore.getState().hydrate();
    const state = useCartStore.getState();
    expect(state.cart).toEqual({ _id: "c1", lineItems: [] });
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("hydrate records error on failure", async () => {
    getCartAction.mockResolvedValueOnce({ ok: false, error: "offline" });
    const { useCartStore } = await freshStore();
    await useCartStore.getState().hydrate();
    expect(useCartStore.getState().error).toBe("offline");
    expect(useCartStore.getState().loading).toBe(false);
  });

  it("addItem applies optimistic pending item then clears on success", async () => {
    addItemAction.mockImplementationOnce(async () => {
      const { useCartStore } = await import("@/lib/cart/store");
      expect(useCartStore.getState().pendingItems).toHaveLength(1);
      return { ok: true, cart: { _id: "c1", lineItems: [{ _id: "li1" }] } };
    });
    const { useCartStore } = await freshStore();
    const ok = await useCartStore
      .getState()
      .addItem({ productId: "p1", quantity: 1 });
    expect(ok).toBe(true);
    const state = useCartStore.getState();
    expect(state.pendingItems).toHaveLength(0);
    expect(state.cart?._id).toBe("c1");
  });

  it("addItem rolls back pending item on failure", async () => {
    addItemAction.mockResolvedValueOnce({ ok: false, error: "boom" });
    const { useCartStore } = await freshStore();
    const ok = await useCartStore
      .getState()
      .addItem({ productId: "p1", quantity: 1 });
    expect(ok).toBe(false);
    const state = useCartStore.getState();
    expect(state.pendingItems).toHaveLength(0);
    expect(state.error).toBe("boom");
  });

  it("removeItem optimistically drops item and keeps server truth on success", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.setState({
      cart: {
        _id: "c1",
        lineItems: [
          { _id: "li1", quantity: 1 },
          { _id: "li2", quantity: 2 },
        ],
      } as never,
    });
    removeItemAction.mockResolvedValueOnce({
      ok: true,
      cart: { _id: "c1", lineItems: [{ _id: "li2", quantity: 2 }] },
    });
    const ok = await useCartStore.getState().removeItem("li1");
    expect(ok).toBe(true);
    expect(useCartStore.getState().cart?.lineItems).toHaveLength(1);
  });

  it("removeItem rolls back on failure", async () => {
    const { useCartStore } = await freshStore();
    const initial = {
      _id: "c1",
      lineItems: [
        { _id: "li1", quantity: 1 },
        { _id: "li2", quantity: 2 },
      ],
    } as never;
    useCartStore.setState({ cart: initial });
    removeItemAction.mockResolvedValueOnce({ ok: false, error: "nope" });
    const ok = await useCartStore.getState().removeItem("li1");
    expect(ok).toBe(false);
    expect(useCartStore.getState().cart).toEqual(initial);
    expect(useCartStore.getState().error).toBe("nope");
  });

  it("updateQuantity optimistically updates then reconciles", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.setState({
      cart: {
        _id: "c1",
        lineItems: [{ _id: "li1", quantity: 1 }],
      } as never,
    });
    updateQuantityAction.mockResolvedValueOnce({
      ok: true,
      cart: { _id: "c1", lineItems: [{ _id: "li1", quantity: 3 }] },
    });
    const ok = await useCartStore.getState().updateQuantity("li1", 3);
    expect(ok).toBe(true);
    expect(useCartStore.getState().cart?.lineItems?.[0].quantity).toBe(3);
  });

  it("updateQuantity rolls back on failure", async () => {
    const { useCartStore } = await freshStore();
    const initial = {
      _id: "c1",
      lineItems: [{ _id: "li1", quantity: 1 }],
    } as never;
    useCartStore.setState({ cart: initial });
    updateQuantityAction.mockResolvedValueOnce({
      ok: false,
      error: "rate limit",
    });
    const ok = await useCartStore.getState().updateQuantity("li1", 3);
    expect(ok).toBe(false);
    expect(useCartStore.getState().cart).toEqual(initial);
  });

  it("selectItemCount sums server + optimistic items", async () => {
    const { useCartStore, selectItemCount } = await freshStore();
    useCartStore.setState({
      cart: {
        _id: "c1",
        lineItems: [
          { _id: "li1", quantity: 2 },
          { _id: "li2", quantity: 3 },
        ],
      } as never,
      pendingItems: [
        {
          _id: "opt-1",
          productId: "p",
          quantity: 4,
          pending: true,
        },
      ],
    });
    expect(selectItemCount(useCartStore.getState())).toBe(9);
  });
});

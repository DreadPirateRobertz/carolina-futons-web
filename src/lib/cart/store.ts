"use client";

import { create } from "zustand";
import {
  addItemAction,
  getCartAction,
  removeItemAction,
  updateQuantityAction,
} from "@/app/actions/cart";
import type { LineItemInput, WixCart } from "@/lib/wix/cart";

// Client-side cart store. Optimistic mutations are applied synchronously so the
// drawer/badge update before the server action resolves, then reconciled with
// the authoritative cart returned from Wix. On failure we roll back and surface
// a toast-ready error message.

type OptimisticItem = {
  _id: string; // temp id for optimistic inserts, replaced on server response
  productId: string;
  variantId?: string;
  quantity: number;
  pending: true;
};

type State = {
  cart: WixCart | null;
  pendingItems: OptimisticItem[];
  loading: boolean;
  error: string | null;
};

type Actions = {
  hydrate: () => Promise<void>;
  addItem: (input: LineItemInput) => Promise<boolean>;
  removeItem: (lineItemId: string) => Promise<boolean>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<boolean>;
  clearError: () => void;
};

export type CartStore = State & Actions;

export const useCartStore = create<CartStore>((set, get) => ({
  cart: null,
  pendingItems: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    set({ loading: true, error: null });
    const result = await getCartAction();
    if (result.ok) set({ cart: result.cart, loading: false });
    else set({ error: result.error, loading: false });
  },

  addItem: async (input) => {
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: OptimisticItem = {
      _id: optimisticId,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      pending: true,
    };
    set((s) => ({
      pendingItems: [...s.pendingItems, optimistic],
      error: null,
    }));

    const result = await addItemAction(input);
    if (!result.ok) {
      set((s) => ({
        pendingItems: s.pendingItems.filter((p) => p._id !== optimisticId),
        error: result.error,
      }));
      return false;
    }
    set((s) => ({
      cart: result.cart,
      pendingItems: s.pendingItems.filter((p) => p._id !== optimisticId),
    }));
    return true;
  },

  removeItem: async (lineItemId) => {
    const prev = get().cart;
    set((s) => ({
      cart: s.cart
        ? {
            ...s.cart,
            lineItems: (s.cart.lineItems ?? []).filter(
              (li) => li._id !== lineItemId,
            ),
          }
        : s.cart,
      error: null,
    }));

    const result = await removeItemAction(lineItemId);
    if (!result.ok) {
      set({ cart: prev, error: result.error });
      return false;
    }
    set({ cart: result.cart });
    return true;
  },

  updateQuantity: async (lineItemId, quantity) => {
    const prev = get().cart;
    set((s) => ({
      cart: s.cart
        ? {
            ...s.cart,
            lineItems: (s.cart.lineItems ?? []).map((li) =>
              li._id === lineItemId ? { ...li, quantity } : li,
            ),
          }
        : s.cart,
      error: null,
    }));

    const result = await updateQuantityAction(lineItemId, quantity);
    if (!result.ok) {
      set({ cart: prev, error: result.error });
      return false;
    }
    set({ cart: result.cart });
    return true;
  },
}));

export function selectItemCount(state: CartStore): number {
  const serverCount = (state.cart?.lineItems ?? []).reduce(
    (sum, li) => sum + (li.quantity ?? 0),
    0,
  );
  const optimisticCount = state.pendingItems.reduce(
    (sum, li) => sum + li.quantity,
    0,
  );
  return serverCount + optimisticCount;
}

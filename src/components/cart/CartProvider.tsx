"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import {
  cartItemCount,
  cartReducer,
  cartSubtotalCents,
  EMPTY_CART,
  type CartAction,
  type CartLineItem,
  type CartState,
} from "@/lib/cart/cart-state";

type CartContextValue = {
  state: CartState;
  itemCount: number;
  subtotalCents: number;
  isOpen: boolean;
  isCartPending: boolean;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  dispatch: (action: CartAction) => void;
  addLine: (line: CartLineItem) => void;
  removeLine: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  beginCartWrite: () => void;
  endCartWrite: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addLine = useCallback(
    (line: CartLineItem) => dispatch({ type: "add", line }),
    [],
  );
  const removeLine = useCallback(
    (id: string) => dispatch({ type: "remove", id }),
    [],
  );
  const setQuantity = useCallback(
    (id: string, quantity: number) =>
      dispatch({ type: "setQuantity", id, quantity }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const beginCartWrite = useCallback(
    () => setPendingWrites((n) => n + 1),
    [],
  );
  const endCartWrite = useCallback(
    () => setPendingWrites((n) => Math.max(0, n - 1)),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      state,
      itemCount: cartItemCount(state),
      subtotalCents: cartSubtotalCents(state),
      isOpen,
      isCartPending: pendingWrites > 0,
      openCart,
      closeCart,
      setOpen: setIsOpen,
      dispatch,
      addLine,
      removeLine,
      setQuantity,
      clear,
      beginCartWrite,
      endCartWrite,
    }),
    [state, isOpen, pendingWrites, openCart, closeCart, addLine, removeLine, setQuantity, clear, beginCartWrite, endCartWrite],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a <CartProvider>");
  }
  return ctx;
}

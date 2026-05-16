"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  cartItemCount,
  cartReducer,
  cartSubtotalCents,
  cartTotalCents,
  EMPTY_CART,
  type AppliedCoupon,
  type CartAction,
  type CartLineItem,
  type CartState,
} from "@/lib/cart/cart-state";
import {
  loadCartFromStorage,
  saveCartToStorage,
} from "@/lib/cart/cart-storage";

type CartContextValue = {
  state: CartState;
  itemCount: number;
  subtotalCents: number;
  totalCents: number;
  appliedCoupon: AppliedCoupon | undefined;
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
  setAppliedCoupon: (code: string, discountCents: number) => void;
  clearAppliedCoupon: () => void;
  beginCartWrite: () => void;
  endCartWrite: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);

  // cfw-7so: hydrate from localStorage on first client mount and persist on
  // every state change so the cart survives a hard navigation between PDP and
  // /cart. SSR always paints EMPTY_CART (no localStorage on the server) so the
  // first client paint matches and avoids hydration mismatch warnings.
  const storageInitialized = useRef(false);
  useEffect(() => {
    if (!storageInitialized.current) {
      storageInitialized.current = true;
      const stored = loadCartFromStorage();
      if (stored && stored.lines.length > 0) {
        dispatch({ type: "hydrate", lines: stored.lines });
      }
      return;
    }
    saveCartToStorage(state);
  }, [state]);

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
  const setAppliedCoupon = useCallback(
    (code: string, discountCents: number) =>
      dispatch({ type: "setCoupon", code, discountCents }),
    [],
  );
  const clearAppliedCoupon = useCallback(
    () => dispatch({ type: "clearCoupon" }),
    [],
  );
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
      totalCents: cartTotalCents(state),
      appliedCoupon: state.appliedCoupon,
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
      setAppliedCoupon,
      clearAppliedCoupon,
      beginCartWrite,
      endCartWrite,
    }),
    [state, isOpen, pendingWrites, openCart, closeCart, addLine, removeLine, setQuantity, clear, setAppliedCoupon, clearAppliedCoupon, beginCartWrite, endCartWrite],
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

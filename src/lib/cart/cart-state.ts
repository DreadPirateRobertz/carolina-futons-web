// Local (client-side) cart state for cf-3qt.2.3. Pure reducer + helpers so that
// cf-3qt.2.2 AddToCart and cf-3qt.2.4 Checkout can reuse the same types once
// morgott wires server actions through `@/lib/wix/cart`. Kept framework-free so
// it's trivially testable without a React renderer.
//
// `unitPriceCents` is the canonical price for subtotal math — floats lose
// pennies at scale. `formattedUnitPrice` is what the server gave us for display
// (e.g. "$799.00" or "$1,099"); we keep it alongside instead of reformatting
// client-side so we don't drift from Wix's currency/locale.

export type CartLineItem = {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  imageUrl?: string;
  quantity: number;
  unitPriceCents: number;
  formattedUnitPrice: string;
  productUrl?: string;
};

export type CartState = {
  lines: ReadonlyArray<CartLineItem>;
};

export type CartAction =
  | { type: "add"; line: CartLineItem }
  | { type: "remove"; id: string }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "clear" };

export const EMPTY_CART: CartState = { lines: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.findIndex((l) => l.id === action.line.id);
      if (existing === -1) {
        return { lines: [...state.lines, action.line] };
      }
      const next = state.lines.slice();
      const prev = next[existing];
      next[existing] = {
        ...prev,
        quantity: prev.quantity + action.line.quantity,
      };
      return { lines: next };
    }
    case "remove":
      return { lines: state.lines.filter((l) => l.id !== action.id) };
    case "setQuantity": {
      if (action.quantity <= 0) {
        return { lines: state.lines.filter((l) => l.id !== action.id) };
      }
      return {
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, quantity: action.quantity } : l,
        ),
      };
    }
    case "clear":
      return EMPTY_CART;
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotalCents(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

export function formatCents(cents: number, currency = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  return formatter.format(cents / 100);
}

export function makeLineId(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

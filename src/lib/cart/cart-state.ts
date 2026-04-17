// Local (client-side) cart state for cf-3qt.2.3. Pure reducer + helpers, kept
// framework-free so it's trivially testable without a React renderer.
//
// `unitPriceCents` is the canonical price for subtotal math — floats lose
// pennies at scale. `formattedUnitPrice` is what the server gave us for display
// (e.g. "$799.00" or "$1,099"); we keep it alongside instead of reformatting
// client-side so we don't drift from the server's currency/locale.

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
      // Guard against NaN/negative propagating into the subtotal — cheaper to
      // stop a bad line here than to ship a "$NaN" footer once server parsing
      // lands (cf-3qt.2.2).
      if (!isFinitePositive(action.line.quantity)) return state;
      if (!isFiniteNonNeg(action.line.unitPriceCents)) return state;
      const existing = state.lines.findIndex((l) => l.id === action.line.id);
      if (existing === -1) {
        return { lines: [...state.lines, action.line] };
      }
      const next = state.lines.slice();
      const prev = next[existing];
      // On merge the latest line's descriptive fields win (product name, image,
      // variant label, price) so a server round-trip can refresh stale client
      // data, but quantities accumulate instead of replacing.
      next[existing] = {
        ...prev,
        ...action.line,
        quantity: prev.quantity + action.line.quantity,
      };
      return { lines: next };
    }
    case "remove":
      return { lines: state.lines.filter((l) => l.id !== action.id) };
    case "setQuantity": {
      if (!isFiniteNonNeg(action.quantity)) return state;
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

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}
function isFiniteNonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
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

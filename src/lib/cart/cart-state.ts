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
  | { type: "clear" }
  | { type: "hydrate"; lines: ReadonlyArray<CartLineItem> };

export const EMPTY_CART: CartState = { lines: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      // Guard against NaN/negative propagating into the subtotal — cheaper to
      // stop a bad line here than to ship a "$NaN" footer. Warn in dev so a
      // broken server-sync payload doesn't present as "Add to Cart does
      // nothing"; the TODO for proper telemetry lives in the warnBadInput
      // comment below.
      if (!isFinitePositive(action.line.quantity)) {
        warnBadInput("add.quantity", action.line.quantity);
        return state;
      }
      if (!isFiniteNonNeg(action.line.unitPriceCents)) {
        warnBadInput("add.unitPriceCents", action.line.unitPriceCents);
        return state;
      }
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
    case "remove": {
      if (!state.lines.some((l) => l.id === action.id)) {
        warnBadInput("remove.id", action.id);
        return state;
      }
      return { lines: state.lines.filter((l) => l.id !== action.id) };
    }
    case "setQuantity": {
      if (!isFiniteNonNeg(action.quantity)) {
        warnBadInput("setQuantity.quantity", action.quantity);
        return state;
      }
      if (!state.lines.some((l) => l.id === action.id)) {
        warnBadInput("setQuantity.id", action.id);
        return state;
      }
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
    case "hydrate":
      return { lines: [...action.lines] };
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

// Tagged set of reducer drop-sites. Adding a new guard? Extend this union so
// the call site is type-checked instead of being a free-form string.
type BadInputField =
  | "add.quantity"
  | "add.unitPriceCents"
  | "remove.id"
  | "setQuantity.quantity"
  | "setQuantity.id";

// Dev-only breadcrumb when we drop an action. In production the reducer still
// silently returns prior state — cart is a hot path and we don't want to spam
// an error tracker. In dev the warning makes "Add to Cart does nothing"
// debuggable without attaching a debugger to the reducer. TODO: attach a real
// telemetry sink once the analytics layer lands.
function warnBadInput(field: BadInputField, value: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[cart-state] ignored action with invalid ${field}: ${String(value)}`,
    );
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

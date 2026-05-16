// Local (client-side) cart state for cf-3qt.2.3. Pure reducer + helpers, kept
// framework-free so it's trivially testable without a React renderer.
//
// `unitPriceCents` is the canonical price for subtotal math — floats lose
// pennies at scale. `formattedUnitPrice` is what the server gave us for display
// (e.g. "$799.00" or "$1,099"); we keep it alongside instead of reformatting
// client-side so we don't drift from the server's currency/locale.

import { trackCartDropInvalid } from "@/lib/analytics/ga4-events";

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

export type AppliedCoupon = {
  code: string;
  discountCents: number;
};

export type CartState = {
  lines: ReadonlyArray<CartLineItem>;
  // cf-5qv7 (cf-snil.fu1): optional applied-coupon snapshot so CartDrawer
  // can render '- Discount: -$X.XX' before the user redirects to the
  // Wix-hosted checkout page. The server is authoritative — applied
  // coupons MUST flow through hydrateCartAction so we never display a
  // stale discount; the reducer's `setCoupon` is for the immediate
  // optimistic write after a successful applyCouponAction call.
  appliedCoupon?: AppliedCoupon;
};

export type CartAction =
  | { type: "add"; line: CartLineItem }
  | { type: "remove"; id: string }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "clear" }
  | {
      type: "hydrate";
      lines: ReadonlyArray<CartLineItem>;
      appliedCoupon?: AppliedCoupon;
    }
  | { type: "setCoupon"; code: string; discountCents: number }
  | { type: "clearCoupon" };

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
        return { ...state, lines: [...state.lines, action.line] };
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
      return { ...state, lines: next };
    }
    case "remove": {
      if (!state.lines.some((l) => l.id === action.id)) {
        warnBadInput("remove.id", action.id);
        return state;
      }
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };
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
        return {
          ...state,
          lines: state.lines.filter((l) => l.id !== action.id),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, quantity: action.quantity } : l,
        ),
      };
    }
    case "clear":
      return EMPTY_CART;
    case "hydrate":
      // The hydrate path is authoritative — the server cart shape wins.
      // Omitting appliedCoupon in the payload means "no coupon on server",
      // which should propagate to client state (not preserved from prior
      // local state). cf-5qv7.
      return action.appliedCoupon
        ? { lines: [...action.lines], appliedCoupon: action.appliedCoupon }
        : { lines: [...action.lines] };
    case "setCoupon": {
      // cf-5qv7: optimistic write after a successful applyCouponAction.
      // Guard against empty/whitespace codes and negative discounts —
      // the server should never return these, but a future caller bug
      // shouldn't render "$NaN" or "-$-500.00" in the drawer footer.
      const trimmed = action.code.trim();
      if (trimmed.length === 0) {
        warnBadInput("setCoupon.code", action.code);
        return state;
      }
      if (!isFiniteNonNeg(action.discountCents)) {
        warnBadInput("setCoupon.discountCents", action.discountCents);
        return state;
      }
      return {
        ...state,
        appliedCoupon: { code: trimmed, discountCents: action.discountCents },
      };
    }
    case "clearCoupon": {
      if (!state.appliedCoupon) return state;
      // _ prefix satisfies eslint's no-unused-vars `Allowed unused vars
      // must match /^_/u` rule — no disable directive needed.
      const { appliedCoupon: _, ...rest } = state;
      return rest;
    }
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
  | "setQuantity.id"
  | "setCoupon.code"
  | "setCoupon.discountCents";

// Dev-only console.warn keeps "Add to Cart does nothing" debuggable without
// attaching a debugger. In production the reducer still silently returns
// prior state — cart is a hot path. cfw-aor: also fire a GA4 custom event
// so dropped actions show up in product-side analytics. The GA4 helper
// no-ops when window.gtag is unavailable (SSR, ad-blocker, env unset),
// matching the pattern used by the rest of src/lib/analytics/ga4-events.ts.
function warnBadInput(field: BadInputField, value: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[cart-state] ignored action with invalid ${field}: ${String(value)}`,
    );
  }
  trackCartDropInvalid(field, value);
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotalCents(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

// cf-5qv7: subtotal minus applied-coupon discount, floored at 0. Used by
// the CartDrawer footer to render the post-discount total above the
// checkout CTA. Wix returns a non-negative discount on the server side;
// the floor is defensive against future bugs and matches the "no negative
// money" invariant the rest of the cart code follows.
export function cartTotalCents(state: CartState): number {
  const subtotal = cartSubtotalCents(state);
  const discount = state.appliedCoupon?.discountCents ?? 0;
  return Math.max(0, subtotal - discount);
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

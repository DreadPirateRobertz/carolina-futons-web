"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { addItemAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";
import { makeLineId } from "@/lib/cart/cart-state";
import type { CartLineCustomField } from "@/lib/wix/cart";
import type { WixProduct } from "@/lib/wix/products";

type Props = { cards: WixProduct[] };

/**
 * Stable order matters: Wix surfaces these titles verbatim in the order
 * admin + customer confirmation email, and downstream automation may
 * position-index them. Shared constants prevent the buildCustomTextFields
 * helper and the test assertions from drifting independently — change
 * here propagates to both.
 */
const FIELD_TITLES = {
  recipientEmail: "Recipient email",
  recipientName: "Recipient name",
  senderName: "Sender name",
  personalMessage: "Personal message",
  scheduledDelivery: "Scheduled delivery",
} as const;

/**
 * GiftCardPicker — denomination grid + optional "send as a gift"
 * recipient-meta form, then one-click add-to-cart.
 *
 * cf-gift-g1 closed the Wix parity gap on gift-card recipient metadata.
 * Pre-cf-gift-g1 the cfw picker was amount-only; Wix's gift-card flow
 * captured recipient email, sender name, personal message, and a
 * scheduled delivery date. The new "send as a gift" toggle reveals all
 * four fields plus a recipient-name field. Filled values ride along to
 * Wix as line-item `customTextFields`, which surface in the order admin
 * and on the customer confirmation email.
 *
 * Default state (toggle OFF) is byte-identical to the pre-cf-gift-g1
 * payload — buying a gift card for yourself stays one-click. The
 * customTextFields field on `addItemAction({ ... })` is omitted entirely
 * when no fields are filled, so the Wix request body is unchanged.
 */
export function GiftCardPicker({ cards }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    cards[0]?._id ?? null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addLine, removeLine, openCart } = useCart();

  // cf-gift-g1: "send as a gift" form state. Hidden until the toggle is
  // checked. Fields stay local — they only ride along on add-to-cart
  // when isGift is true, so toggling off effectively clears them from
  // the next request without explicit reset logic.
  const [isGift, setIsGift] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [scheduledDelivery, setScheduledDelivery] = useState("");

  if (cards.length === 0) {
    return (
      <p className="text-cf-charcoal/60">
        Gift cards are coming soon — check back shortly.
      </p>
    );
  }

  const selected = cards.find((c) => c._id === selectedId) ?? cards[0];
  const priceCents = Math.round((selected.priceData?.price ?? 0) * 100);
  const formattedPrice =
    selected.priceData?.formatted?.price ?? `$${selected.priceData?.price ?? 0}`;
  const imageUrl = selected.media?.mainMedia?.image?.url;

  /**
   * Build the per-line personalization payload from the recipient form.
   * Returns undefined when the toggle is off OR when no fields are
   * filled — `addItemAction` omits the property entirely in that case,
   * so the Wix request body matches the pre-cf-gift-g1 shape byte-for-
   * byte. Order of the entries is stable so order-admin / email-template
   * consumers can position-index if they want to (recipient first,
   * scheduled-delivery last).
   */
  function buildCustomTextFields(): readonly CartLineCustomField[] | undefined {
    if (!isGift) return undefined;
    const fields: CartLineCustomField[] = [];
    const e = recipientEmail.trim();
    const rn = recipientName.trim();
    const sn = senderName.trim();
    const msg = personalMessage.trim();
    const date = scheduledDelivery.trim();
    if (e) fields.push({ title: FIELD_TITLES.recipientEmail, value: e });
    if (rn) fields.push({ title: FIELD_TITLES.recipientName, value: rn });
    if (sn) fields.push({ title: FIELD_TITLES.senderName, value: sn });
    if (msg) fields.push({ title: FIELD_TITLES.personalMessage, value: msg });
    if (date) fields.push({ title: FIELD_TITLES.scheduledDelivery, value: date });
    return fields.length > 0 ? fields : undefined;
  }

  async function handleAddToCart() {
    if (!selected._id) return;

    // cf-gift-g1: when the gift toggle is on, recipient email is the one
    // required field (everything else stays optional — Wix orders without
    // it would still be honored but the customer couldn't be reached for
    // delivery). Bail with an inline error before touching the cart.
    if (isGift && !recipientEmail.trim()) {
      setError("Recipient email is required when sending as a gift.");
      return;
    }

    setPending(true);
    setError(null);

    const customTextFields = buildCustomTextFields();

    const tempId = makeLineId(selected._id);
    addLine({
      id: tempId,
      productId: selected._id,
      productName: selected.name ?? "Gift Card",
      quantity: 1,
      unitPriceCents: priceCents,
      formattedUnitPrice: formattedPrice,
      imageUrl,
    });

    const result = await addItemAction({
      productId: selected._id,
      quantity: 1,
      ...(customTextFields ? { customTextFields } : {}),
    });
    setPending(false);

    if (!result.ok) {
      removeLine(tempId);
      setError(result.error);
      return;
    }
    openCart();
  }

  return (
    <div className="space-y-8">
      {/* Denomination grid */}
      <div>
        <p className="mb-3 text-sm font-medium text-cf-charcoal">
          Select amount
        </p>
        <div className="flex flex-wrap gap-3">
          {cards.map((card) => {
            const label =
              card.priceData?.formatted?.price ??
              `$${card.priceData?.price ?? ""}`;
            return (
              <button
                key={card._id}
                type="button"
                aria-pressed={card._id === selectedId}
                onClick={() => {
                  setSelectedId(card._id ?? null);
                  setError(null);
                }}
                className={[
                  "rounded-md border px-5 py-2.5 text-sm font-semibold transition",
                  card._id === selectedId
                    ? "border-cf-espresso bg-cf-espresso text-white"
                    : "border-cf-smoke bg-white text-cf-charcoal hover:border-cf-espresso",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected card preview */}
      <div className="flex items-start gap-6 rounded-lg border border-cf-smoke bg-cf-sand/40 p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-cf-espresso text-white">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={selected.name ?? "Gift card"}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Gift className="h-8 w-8" />
          )}
        </div>
        <div>
          <p className="font-heading text-lg font-semibold text-cf-espresso">
            {selected.name ?? "Carolina Futons Gift Card"}
          </p>
          <p className="mt-1 text-cf-charcoal/70 text-sm">
            {selected.description
              ? selected.description.replace(/<[^>]+>/g, "").slice(0, 120)
              : "Redeemable on any purchase at carolinafutons.com or in-store."}
          </p>
          <p className="mt-2 text-xl font-bold text-cf-espresso">
            {formattedPrice}
          </p>
        </div>
      </div>

      {/* cf-gift-g1: "Send as a gift" toggle. Hidden form state lives in
          component-local useState — the values only get serialized into
          customTextFields when the toggle is on AND the user clicks
          add-to-cart, so toggling off effectively clears the next
          submission. */}
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-cf-charcoal">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => {
              setIsGift(e.target.checked);
              setError(null);
            }}
            className="h-4 w-4 rounded border-cf-smoke text-cf-cta focus:ring-cf-cta"
          />
          Send as a gift
        </label>

        {isGift ? (
          <div className="space-y-3 rounded-md border border-cf-smoke bg-white p-4">
            <p className="text-xs text-cf-charcoal/70">
              The recipient gets the gift-card code by email. You stay on
              the order receipt as the buyer.
            </p>
            <div>
              <label
                htmlFor="gc-recipient-email"
                className="block text-xs font-medium text-cf-charcoal"
              >
                Recipient email <span className="text-red-600">*</span>
              </label>
              <input
                id="gc-recipient-email"
                type="email"
                aria-required="true"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1 w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
              />
            </div>
            <div>
              <label
                htmlFor="gc-recipient-name"
                className="block text-xs font-medium text-cf-charcoal"
              >
                Recipient name
              </label>
              <input
                id="gc-recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Alice"
                className="mt-1 w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
              />
            </div>
            <div>
              <label
                htmlFor="gc-sender-name"
                className="block text-xs font-medium text-cf-charcoal"
              >
                Your name
              </label>
              <input
                id="gc-sender-name"
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="From"
                className="mt-1 w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
              />
            </div>
            <div>
              <label
                htmlFor="gc-personal-message"
                className="block text-xs font-medium text-cf-charcoal"
              >
                Personal message
              </label>
              <textarea
                id="gc-personal-message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                placeholder="Optional note — appears on the recipient's email."
                className="mt-1 w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
              />
            </div>
            <div>
              <label
                htmlFor="gc-scheduled-delivery"
                className="block text-xs font-medium text-cf-charcoal"
              >
                Scheduled delivery
              </label>
              <input
                id="gc-scheduled-delivery"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={scheduledDelivery}
                onChange={(e) => setScheduledDelivery(e.target.value)}
                className="mt-1 w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
              />
              <p className="mt-1 text-xs text-cf-charcoal/60">
                Leave empty to send immediately after purchase.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Add to cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={pending || !selected._id}
        className="w-full rounded-md bg-cf-cta px-6 py-3 font-semibold text-white transition hover:bg-cf-cta/90 disabled:opacity-60 sm:w-auto sm:min-w-48"
      >
        {pending ? "Adding…" : `Add ${formattedPrice} gift card to cart`}
      </button>

      <p className="text-xs text-cf-charcoal/70">
        Gift cards are delivered digitally and can be applied at checkout.
        Non-refundable. No cash value.
      </p>
    </div>
  );
}

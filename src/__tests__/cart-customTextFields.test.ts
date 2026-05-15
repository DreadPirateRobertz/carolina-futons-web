/**
 * cf-gift-g1: pin the customTextFields pass-through contract on
 * {@link toLineItemPayload}. The Wix `addToCurrentCart` line-item shape
 * accepts an optional top-level `customTextFields` array — the
 * personalization payload surfaces in the order admin + customer
 * confirmation email. We need:
 *   1. byte-identical payload for non-personalized flows (omit field)
 *   2. pass-through for personalized flows (include array)
 *   3. empty arrays treated like absence (don't ship `customTextFields: []`
 *      to Wix — keeps the payload diff tight)
 */
import { describe, expect, it } from "vitest";

import {
  toLineItemPayload,
  WIX_STORES_APP_ID,
  type LineItemInput,
} from "@/lib/wix/cart";

describe("toLineItemPayload (cf-gift-g1)", () => {
  it("omits customTextFields entirely when input has none", () => {
    const input: LineItemInput = { productId: "P-1", quantity: 1 };
    const out = toLineItemPayload(input);
    expect(out).toEqual({
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: "P-1",
      },
      quantity: 1,
    });
    expect(out).not.toHaveProperty("customTextFields");
  });

  it("omits customTextFields when input passes an empty array", () => {
    const input: LineItemInput = {
      productId: "P-1",
      quantity: 1,
      customTextFields: [],
    };
    const out = toLineItemPayload(input);
    expect(out).not.toHaveProperty("customTextFields");
  });

  it("passes through a single customTextField unchanged", () => {
    const input: LineItemInput = {
      productId: "gc-50",
      quantity: 1,
      customTextFields: [{ title: "Recipient email", value: "alice@example.com" }],
    };
    const out = toLineItemPayload(input);
    expect(out.customTextFields).toEqual([
      { title: "Recipient email", value: "alice@example.com" },
    ]);
  });

  it("passes through multiple customTextFields in order", () => {
    const input: LineItemInput = {
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "Recipient email", value: "alice@example.com" },
        { title: "Sender name", value: "Bob" },
        { title: "Personal message", value: "Happy birthday!" },
        { title: "Scheduled delivery", value: "2026-12-25" },
      ],
    };
    const out = toLineItemPayload(input);
    expect(out.customTextFields).toHaveLength(4);
    expect(out.customTextFields?.[0]?.title).toBe("Recipient email");
    expect(out.customTextFields?.[3]?.value).toBe("2026-12-25");
  });

  it("preserves variantId + options alongside customTextFields", () => {
    const input: LineItemInput = {
      productId: "P-1",
      quantity: 2,
      variantId: "V-1",
      options: { Size: "Queen" },
      customTextFields: [{ title: "Note", value: "ground floor" }],
    };
    const out = toLineItemPayload(input);
    expect(out.catalogReference).toEqual({
      appId: WIX_STORES_APP_ID,
      catalogItemId: "P-1",
      options: { variantId: "V-1", options: { Size: "Queen" } },
    });
    expect(out.quantity).toBe(2);
    expect(out.customTextFields).toEqual([
      { title: "Note", value: "ground floor" },
    ]);
  });
});

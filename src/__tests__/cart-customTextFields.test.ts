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

/**
 * Defensive filter on the lib boundary.
 *
 * Empty/whitespace title or value would render in the Wix order admin as
 * a blank row and ship to Wix as semantically meaningless metadata. The
 * UI layer already trims+drops, but a callsite that bypasses the form
 * (server action invoked from a script, future API client) could still
 * smuggle blanks in. Pin defense at the lib layer so it's enforced
 * regardless of caller.
 *
 * The byte-identical invariant (no `customTextFields` key when every
 * entry filters out) preserves the non-personalized payload shape — same
 * guarantee the empty-array case above pins.
 */
describe("toLineItemPayload — defensive filter", () => {
  it("drops entries with empty title", () => {
    const out = toLineItemPayload({
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "", value: "alice@example.com" },
        { title: "Recipient email", value: "alice@example.com" },
      ],
    });
    expect(out.customTextFields).toEqual([
      { title: "Recipient email", value: "alice@example.com" },
    ]);
  });

  it("drops entries with empty value", () => {
    const out = toLineItemPayload({
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "Recipient email", value: "" },
        { title: "Sender name", value: "Bob" },
      ],
    });
    expect(out.customTextFields).toEqual([
      { title: "Sender name", value: "Bob" },
    ]);
  });

  it("drops entries with whitespace-only title or value", () => {
    const out = toLineItemPayload({
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "   ", value: "alice@example.com" },
        { title: "Recipient email", value: "  \t\n " },
        { title: "Sender name", value: "Bob" },
      ],
    });
    expect(out.customTextFields).toEqual([
      { title: "Sender name", value: "Bob" },
    ]);
  });

  it("omits customTextFields entirely when every entry filters out (byte-identical invariant)", () => {
    const out = toLineItemPayload({
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "", value: "alice@example.com" },
        { title: "Sender", value: "   " },
      ],
    });
    expect(out).not.toHaveProperty("customTextFields");
    expect(out).toEqual({
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: "gc-50",
      },
      quantity: 1,
    });
  });

  it("preserves order of surviving entries", () => {
    const out = toLineItemPayload({
      productId: "gc-50",
      quantity: 1,
      customTextFields: [
        { title: "Recipient email", value: "alice@example.com" },
        { title: "", value: "drop me" },
        { title: "Sender name", value: "Bob" },
        { title: "drop me too", value: "   " },
        { title: "Personal message", value: "Happy birthday!" },
      ],
    });
    expect(out.customTextFields).toEqual([
      { title: "Recipient email", value: "alice@example.com" },
      { title: "Sender name", value: "Bob" },
      { title: "Personal message", value: "Happy birthday!" },
    ]);
  });
});

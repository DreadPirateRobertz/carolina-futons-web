// cfw-921: schema + Wix data layer tests.
// These tests import the REAL listProductQa/insertProductQuestion and mock
// the underlying Wix client primitives.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// ── Mocks: Wix client primitives ─────────────────────────────────────────────

const mockQueryCollectionWhere = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  queryCollectionWhere: (...args: unknown[]) => mockQueryCollectionWhere(...args),
}));

const mockItemsSave = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClient: () => ({ items: { save: (...args: unknown[]) => mockItemsSave(...args) } }),
}));

vi.mock("@/lib/observability/log", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// ── Schema — pure unit tests ─────────────────────────────────────────────────

import {
  coerceQaInput,
  validateQaInput,
  hasQaErrors,
  maskName,
} from "@/lib/qa/qa-schema";

describe("coerceQaInput (cfw-921)", () => {
  it("trims whitespace from all string fields", () => {
    const result = coerceQaInput(
      { question: "  Is this easy to convert?  ", name: " Jane Doe ", email: " j@x.com " },
      "futon-frames",
    );
    expect(result.question).toBe("Is this easy to convert?");
    expect(result.name).toBe("Jane Doe");
    expect(result.email).toBe("j@x.com");
  });

  it("coerces missing optional fields to undefined", () => {
    const result = coerceQaInput({ question: "Hello?" }, "futon-frames");
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  it("empty name string becomes undefined", () => {
    const result = coerceQaInput({ question: "Q?", name: "   " }, "futon-frames");
    expect(result.name).toBeUndefined();
  });

  it("passes productSlug through", () => {
    const result = coerceQaInput({ question: "Q?" }, "wall-huggers");
    expect(result.productSlug).toBe("wall-huggers");
  });
});

describe("validateQaInput (cfw-921)", () => {
  const base = { productSlug: "p", question: "Does this fold flat?", name: undefined, email: undefined };

  it("passes when question is valid", () => {
    expect(hasQaErrors(validateQaInput(base))).toBe(false);
  });

  it("rejects empty question", () => {
    expect(validateQaInput({ ...base, question: "" }).question).toBeTruthy();
  });

  it("rejects question over 500 characters", () => {
    expect(validateQaInput({ ...base, question: "x".repeat(501) }).question).toBeTruthy();
  });

  it("accepts question exactly 500 characters", () => {
    expect(hasQaErrors(validateQaInput({ ...base, question: "x".repeat(500) }))).toBe(false);
  });

  it("rejects malformed email when provided", () => {
    expect(validateQaInput({ ...base, email: "not-an-email" }).email).toBeTruthy();
  });

  it("accepts valid optional email", () => {
    expect(hasQaErrors(validateQaInput({ ...base, email: "hello@example.com" }))).toBe(false);
  });

  it("rejects name over 80 characters", () => {
    expect(validateQaInput({ ...base, name: "A".repeat(81) }).name).toBeTruthy();
  });
});

describe("maskName (cfw-921)", () => {
  it("returns Anonymous when name is undefined", () => {
    expect(maskName(undefined)).toBe("Anonymous");
  });

  it("returns single initial with period for one-word name", () => {
    expect(maskName("Jane")).toBe("J.");
  });

  it("returns first + last initial for two-word name", () => {
    expect(maskName("Jane Doe")).toBe("J. D.");
  });

  it("uses first and last word for three-part name", () => {
    expect(maskName("Mary Ann Smith")).toBe("M. S.");
  });
});

// ── product-qa.ts — Wix data layer ───────────────────────────────────────────

import { listProductQa, insertProductQuestion } from "@/lib/wix/product-qa";

const RAW_ANSWERED = {
  _id: "qa-1",
  productSlug: "futon-frames",
  question: "Does it fold flat?",
  askedBy: "J. D.",
  askedAt: "2025-01-15T10:00:00.000Z",
  answer: "Yes, lies completely flat.",
  answeredBy: "Carolina Futons Team",
  answeredAt: "2025-01-16T09:00:00.000Z",
  helpfulCount: 5,
  status: "answered",
};

const RAW_PENDING = {
  _id: "qa-2",
  productSlug: "futon-frames",
  question: "What wood is used?",
  askedBy: "Anonymous",
  askedAt: "2025-02-01T12:00:00.000Z",
  helpfulCount: 1,
  status: "pending",
};

describe("listProductQa (cfw-921)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryCollectionWhere.mockResolvedValue([RAW_ANSWERED, RAW_PENDING]);
  });

  it("queries ProductQandA by productSlug", async () => {
    await listProductQa("futon-frames");
    expect(mockQueryCollectionWhere).toHaveBeenCalledWith(
      "ProductQandA",
      "productSlug",
      "futon-frames",
      50,
    );
  });

  it("sorts by helpfulCount descending", async () => {
    const items = await listProductQa("futon-frames");
    expect(items[0].helpfulCount).toBeGreaterThanOrEqual(items[1].helpfulCount);
  });

  it("maps answer fields correctly", async () => {
    const items = await listProductQa("futon-frames");
    const answered = items.find((i) => i._id === "qa-1")!;
    expect(answered.answer).toBe("Yes, lies completely flat.");
    expect(answered.answeredBy).toBe("Carolina Futons Team");
    expect(answered.status).toBe("answered");
  });

  it("maps pending item with undefined answer", async () => {
    const items = await listProductQa("futon-frames");
    const pending = items.find((i) => i._id === "qa-2")!;
    expect(pending.answer).toBeUndefined();
    expect(pending.status).toBe("pending");
  });

  it("defaults helpfulCount to 0 when missing from raw", async () => {
    mockQueryCollectionWhere.mockResolvedValue([{ ...RAW_PENDING, helpfulCount: undefined }]);
    const items = await listProductQa("futon-frames");
    expect(items[0].helpfulCount).toBe(0);
  });
});

describe("insertProductQuestion (cfw-921)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItemsSave.mockResolvedValue({});
  });

  it("calls client.items.save with the correct collection and fields", async () => {
    await insertProductQuestion({
      productSlug: "futon-frames",
      question: "Does it fold?",
      askedBy: "J. D.",
      askedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(mockItemsSave).toHaveBeenCalledWith(
      "ProductQandA",
      expect.objectContaining({
        productSlug: "futon-frames",
        question: "Does it fold?",
        askedBy: "J. D.",
        askedAt: "2025-01-01T00:00:00.000Z",
        helpfulCount: 0,
        status: "pending",
      }),
    );
  });
});

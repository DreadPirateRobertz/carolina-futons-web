// cfw-921: server action, API route, and CustomerQa component tests.
// The Wix data layer (listProductQa, insertProductQuestion) is mocked here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

vi.mock("server-only", () => ({}));
const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args) }));

vi.mock("@/lib/observability/log", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// Mock the entire product-qa module so submitQuestion + CustomerQa tests
// can control what listProductQa / insertProductQuestion return.
const mockListProductQa = vi.fn();
const mockInsertProductQuestion = vi.fn();
vi.mock("@/lib/wix/product-qa", () => ({
  listProductQa: (...args: unknown[]) => mockListProductQa(...args),
  insertProductQuestion: (...args: unknown[]) => mockInsertProductQuestion(...args),
  PRODUCT_QA_CACHE_TAG: "product-qa",
}));

vi.mock("@/components/product/CustomerQaForm", () => ({
  CustomerQaForm: ({ productSlug }: { productSlug: string }) =>
    `<form data-testid="qa-form" data-slug="${productSlug}"></form>`,
}));

// ── submitQuestion server action ──────────────────────────────────────────────

import { submitQuestion } from "@/app/products/[slug]/qa-actions";
import { initialQaState } from "@/components/product/qa-state";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("submitQuestion (cfw-921)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertProductQuestion.mockResolvedValue(undefined);
  });

  it("returns success when question is valid", async () => {
    const result = await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "Does this fold flat?" }),
    );
    expect(result.status).toBe("success");
    expect(mockInsertProductQuestion).toHaveBeenCalledOnce();
  });

  it("returns error without calling insert when question is empty", async () => {
    const result = await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "" }),
    );
    expect(result.status).toBe("error");
    expect(mockInsertProductQuestion).not.toHaveBeenCalled();
  });

  it("echoes values back on validation error", async () => {
    const result = await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "", name: "Jane" }),
    );
    if (result.status !== "error") throw new Error("expected error");
    expect(result.values.name).toBe("Jane");
  });

  it("calls revalidateTag with 'default' type on success", async () => {
    await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "Q?" }),
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      "product-qa:futon-frames",
      "default",
    );
  });

  it("masks name to initials before storing", async () => {
    await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "Q?", name: "Jane Doe" }),
    );
    expect(mockInsertProductQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ askedBy: "J. D." }),
    );
  });

  it("uses Anonymous when name is not provided", async () => {
    await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "Q?" }),
    );
    expect(mockInsertProductQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ askedBy: "Anonymous" }),
    );
  });

  it("returns transport error when insert throws", async () => {
    mockInsertProductQuestion.mockRejectedValue(new Error("Wix down"));
    const result = await submitQuestion(
      "futon-frames",
      initialQaState,
      makeFormData({ question: "Q?" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.transportError).toBeTruthy();
  });
});

// ── POST /api/product-qa route ────────────────────────────────────────────────

async function callPost(body: unknown, rawBody?: string) {
  const { POST } = await import("@/app/api/product-qa/route");
  const req = new Request("http://localhost/api/product-qa", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawBody ?? JSON.stringify(body),
  });
  return POST(req as Parameters<typeof POST>[0]);
}

describe("POST /api/product-qa (cfw-921)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertProductQuestion.mockResolvedValue(undefined);
  });

  it("returns 201 on valid submission", async () => {
    const res = await callPost({ productSlug: "futon-frames", question: "Q?" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 400 when productSlug is missing", async () => {
    const res = await callPost({ question: "Q?" });
    expect(res.status).toBe(400);
  });

  it("returns 422 when question is empty", async () => {
    const res = await callPost({ productSlug: "futon-frames", question: "" });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it("returns 400 on malformed JSON", async () => {
    const res = await callPost({}, "{bad json");
    expect(res.status).toBe(400);
  });

  it("returns 500 when insert throws", async () => {
    mockInsertProductQuestion.mockRejectedValue(new Error("Wix down"));
    const res = await callPost({ productSlug: "futon-frames", question: "Q?" });
    expect(res.status).toBe(500);
  });

  it("calls revalidateTag after successful insert", async () => {
    await callPost({ productSlug: "futon-frames", question: "Q?" });
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      "product-qa:futon-frames",
      "default",
    );
  });

  it("does not call revalidateTag when insert fails", async () => {
    mockInsertProductQuestion.mockRejectedValue(new Error("Wix down"));
    await callPost({ productSlug: "futon-frames", question: "Q?" });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});

// ── CustomerQa server component render ───────────────────────────────────────

import { CustomerQa } from "@/components/product/CustomerQa";
import type { QaItem } from "@/lib/qa/qa-schema";

const ANSWERED_ITEM: QaItem = {
  _id: "qa-1",
  productSlug: "futon-frames",
  question: "Does it fold?",
  askedBy: "J. D.",
  askedAt: "2025-01-15T10:00:00.000Z",
  answer: "Yes.",
  helpfulCount: 3,
  status: "answered",
};

describe("CustomerQa component (cfw-921)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty-state when no Q&A items", async () => {
    mockListProductQa.mockResolvedValue([]);
    const html = renderToStaticMarkup(
      (await CustomerQa({ productSlug: "futon-frames" })) as ReactElement,
    );
    expect(html).toContain('data-testid="qa-empty-state"');
    expect(html).toContain("Be the first to ask");
  });

  it("renders qa-list when items exist", async () => {
    mockListProductQa.mockResolvedValue([ANSWERED_ITEM]);
    const html = renderToStaticMarkup(
      (await CustomerQa({ productSlug: "futon-frames" })) as ReactElement,
    );
    expect(html).toContain('data-testid="qa-list"');
    expect(html).toContain("Does it fold?");
    expect(html).toContain("Yes.");
  });

  it("shows pending text when answer is absent", async () => {
    mockListProductQa.mockResolvedValue([
      { ...ANSWERED_ITEM, answer: undefined, status: "pending" as const },
    ]);
    const html = renderToStaticMarkup(
      (await CustomerQa({ productSlug: "futon-frames" })) as ReactElement,
    );
    expect(html).toContain("Waiting for an answer");
  });

  it("renders load-error state when listProductQa rejects", async () => {
    mockListProductQa.mockRejectedValue(new Error("Wix error"));
    const html = renderToStaticMarkup(
      (await CustomerQa({ productSlug: "futon-frames" })) as ReactElement,
    );
    expect(html).toContain('data-testid="qa-load-error"');
    expect(html).toContain("temporarily unavailable");
    expect(html).not.toContain('data-testid="qa-empty-state"');
  });

  it("renders section with data-slot='customer-qa'", async () => {
    mockListProductQa.mockResolvedValue([]);
    const html = renderToStaticMarkup(
      (await CustomerQa({ productSlug: "futon-frames" })) as ReactElement,
    );
    expect(html).toContain('data-slot="customer-qa"');
  });
});

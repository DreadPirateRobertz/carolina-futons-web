import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Tokens } from "@wix/sdk";

// ── shared fixtures ────────────────────────────────────────────────

const VISITOR_TOKENS: Tokens = {
  accessToken: { value: "visitor-access", expiresAt: 9_999_999_999 },
  refreshToken: { value: "visitor-refresh", role: "visitor" as Tokens["refreshToken"]["role"] },
};

const MEMBER_TOKENS: Tokens = {
  accessToken: { value: "member-access", expiresAt: 9_999_999_999 },
  refreshToken: { value: "member-refresh", role: "member" as Tokens["refreshToken"]["role"] },
};

const mockGenerateVisitorTokens = vi.fn().mockResolvedValue(VISITOR_TOKENS);
const mockSet = vi.fn();
const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockGet,
    set: mockSet,
  })),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: vi.fn((tokens?: Tokens) => ({
    _tokens: tokens,
    auth: { generateVisitorTokens: mockGenerateVisitorTokens },
  })),
}));

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateVisitorTokens.mockResolvedValue(VISITOR_TOKENS);
});

// ── getVisitorCartClient ───────────────────────────────────────────

describe("getVisitorCartClient", () => {
  it("returns a client using existing visitor tokens from cookie", async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify(VISITOR_TOKENS),
    });

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    const client = await getVisitorCartClient();

    expect(mockGenerateVisitorTokens).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
    expect((client as { _tokens: Tokens })._tokens).toEqual(VISITOR_TOKENS);
  });

  it("returns a client using existing member tokens from cookie", async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify(MEMBER_TOKENS),
    });

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    const client = await getVisitorCartClient();

    expect(mockGenerateVisitorTokens).not.toHaveBeenCalled();
    expect((client as { _tokens: Tokens })._tokens).toEqual(MEMBER_TOKENS);
  });

  it("generates and stores visitor tokens when cookie is absent", async () => {
    mockGet.mockReturnValue(undefined);

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    await getVisitorCartClient();

    expect(mockGenerateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName, cookieValue] = mockSet.mock.calls[0]!;
    expect(cookieName).toBe("wix-session");
    expect(JSON.parse(cookieValue as string)).toEqual(VISITOR_TOKENS);
  });

  it("returns a client with the freshly generated tokens", async () => {
    mockGet.mockReturnValue(undefined);

    const { getWixClientWithTokens } = await import("@/lib/wix-client");
    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    await getVisitorCartClient();

    // Last call to getWixClientWithTokens should have received the generated tokens
    const calls = (getWixClientWithTokens as ReturnType<typeof vi.fn>).mock.calls;
    const lastCallTokens = calls[calls.length - 1]?.[0] as Tokens;
    expect(lastCallTokens).toEqual(VISITOR_TOKENS);
  });

  it("sets cookie with httpOnly and 30-day maxAge", async () => {
    mockGet.mockReturnValue(undefined);

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    await getVisitorCartClient();

    const [, , options] = mockSet.mock.calls[0]! as [string, string, Record<string, unknown>];
    expect(options.httpOnly).toBe(true);
    expect(options.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("does not call set when valid cookie already exists", async () => {
    mockGet.mockReturnValue({ value: JSON.stringify(VISITOR_TOKENS) });

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    await getVisitorCartClient();

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("treats malformed cookie as absent and generates new tokens", async () => {
    mockGet.mockReturnValue({ value: "not-valid-json" });

    const { getVisitorCartClient } = await import("@/lib/wix/wix-visitor-client");
    await getVisitorCartClient();

    expect(mockGenerateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledOnce();
  });
});

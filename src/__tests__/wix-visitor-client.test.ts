import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "wix-session",
  SESSION_COOKIE_OPTIONS: { httpOnly: true, path: "/" },
  parseSessionCookie: vi.fn(),
  serializeSessionTokens: vi.fn((t) => JSON.stringify(t)),
}));

import { cookies } from "next/headers";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { parseSessionCookie } from "@/lib/auth/session";
import { getVisitorCartClient } from "@/lib/wix/wix-visitor-client";

const mockTokens = {
  accessToken: { value: "access-abc", expiresAt: 9999999999 },
  refreshToken: { value: "refresh-xyz", role: "member" as const },
};

const mockJar = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockAnonClient = {
  auth: { generateVisitorTokens: vi.fn() },
};

const mockSeededClient = {};

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockJar);
  mockJar.get.mockReturnValue(undefined);
  (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getWixClientWithTokens as ReturnType<typeof vi.fn>).mockImplementation(
    (tokens?: unknown) => (tokens ? mockSeededClient : mockAnonClient),
  );
  mockAnonClient.auth.generateVisitorTokens.mockResolvedValue(mockTokens);
});

describe("getVisitorCartClient", () => {
  it("returns seeded client immediately when valid session cookie exists", async () => {
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(mockTokens);
    mockJar.get.mockReturnValue({ value: "existing-cookie" });

    const client = await getVisitorCartClient();

    expect(client).toBe(mockSeededClient);
    expect(mockAnonClient.auth.generateVisitorTokens).not.toHaveBeenCalled();
    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("generates visitor tokens on first visit (no cookie)", async () => {
    await getVisitorCartClient();

    expect(mockAnonClient.auth.generateVisitorTokens).toHaveBeenCalledOnce();
  });

  it("returns a client seeded with the generated tokens", async () => {
    const client = await getVisitorCartClient();

    expect(getWixClientWithTokens).toHaveBeenLastCalledWith(mockTokens);
    expect(client).toBe(mockSeededClient);
  });

  it("persists generated tokens in the session cookie", async () => {
    await getVisitorCartClient();

    expect(mockJar.set).toHaveBeenCalledWith(
      "wix-session",
      JSON.stringify(mockTokens),
      expect.objectContaining({ httpOnly: true, maxAge: 30 * 24 * 60 * 60 }),
    );
  });

  it("does not set a cookie when a valid session already exists", async () => {
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(mockTokens);
    mockJar.get.mockReturnValue({ value: "existing-cookie" });

    await getVisitorCartClient();

    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("throws when generateVisitorTokens fails (lets callers decide redirect-with-error)", async () => {
    mockAnonClient.auth.generateVisitorTokens.mockRejectedValue(
      new Error("network timeout"),
    );

    await expect(getVisitorCartClient()).rejects.toThrow("network timeout");
    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("still returns a seeded client when jar.set throws (headers already sent)", async () => {
    mockJar.set.mockImplementation(() => {
      throw new Error("Cannot set headers after they are sent");
    });

    const client = await getVisitorCartClient();

    expect(client).toBe(mockSeededClient);
  });

  it("treats a malformed cookie value as missing and generates fresh tokens", async () => {
    mockJar.get.mockReturnValue({ value: "not-valid-json{{" });
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await getVisitorCartClient();

    expect(mockAnonClient.auth.generateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockJar.set).toHaveBeenCalledOnce();
  });

  it("warns when session cookie is present but parseSessionCookie returns null", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockJar.get.mockReturnValue({ value: "corrupt-value" });
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await getVisitorCartClient();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unparseable"),
    );
    warnSpy.mockRestore();
  });
});

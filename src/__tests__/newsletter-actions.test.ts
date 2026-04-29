import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-newsletter-footer: Server Action for the footer signup.
// Validates email → upserts to a store (file on disk under /data by default).
// Store is injected via module mock so we can assert calls without touching FS.

const storeMocks = vi.hoisted(() => ({
  upsertSubscriber: vi.fn<
    (email: string) => Promise<{ created: boolean }>
  >(async () => ({ created: true })),
}));

vi.mock(
  "@/lib/newsletter/newsletter-store",
  async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("@/lib/newsletter/newsletter-store")>();
    return { ...actual, upsertSubscriber: storeMocks.upsertSubscriber };
  },
);

beforeEach(() => {
  storeMocks.upsertSubscriber.mockReset();
  storeMocks.upsertSubscriber.mockResolvedValue({ created: true });
});

function fd(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

describe("subscribeToNewsletter — validation", () => {
  it("rejects empty email with a field error and does not touch the store", async () => {
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(null, fd({ email: "" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(storeMocks.upsertSubscriber).not.toHaveBeenCalled();
  });

  it("rejects a malformed email with a field error", async () => {
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(null, fd({ email: "nope" }));
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.errors.email).toBeTruthy();
    expect(storeMocks.upsertSubscriber).not.toHaveBeenCalled();
  });
});

describe("subscribeToNewsletter — persistence", () => {
  it("lowercases + trims before upserting (one canonical form per address)", async () => {
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "  Jane@Example.COM  " }),
    );
    expect(result.status).toBe("success");
    expect(storeMocks.upsertSubscriber).toHaveBeenCalledWith(
      "jane@example.com",
    );
  });

  it("returns success:new on first signup", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: true });
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "new@example.com" }),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.alreadySubscribed).toBe(false);
  });

  it("returns success:already when the store reports the email existed", async () => {
    storeMocks.upsertSubscriber.mockResolvedValueOnce({ created: false });
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "existing@example.com" }),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.alreadySubscribed).toBe(true);
  });

  it("surfaces a friendly error when the store throws", async () => {
    storeMocks.upsertSubscriber.mockRejectedValueOnce(new Error("EACCES"));
    const { subscribeToNewsletter } = await import(
      "@/app/newsletter/actions"
    );
    const result = await subscribeToNewsletter(
      null,
      fd({ email: "ok@example.com" }),
    );
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.storeError).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// cf-newsletter-footer: the file-backed subscriber store. We point
// NEWSLETTER_STORE_PATH at a per-test scratch file so the tests can assert
// creation, upsert, and duplicate handling against real disk without
// polluting the repo's /data directory.

let tmpDir: string;
let storePath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "cf-newsletter-store-"));
  storePath = join(tmpDir, "subscribers.json");
  process.env.NEWSLETTER_STORE_PATH = storePath;
});

afterEach(() => {
  delete process.env.NEWSLETTER_STORE_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

async function freshStore() {
  // vi.resetModules() gives each test a fresh module so the store reads
  // the scratch-dir env var set in beforeEach (storePath() is lazy enough
  // that this isn't strictly needed today, but it future-proofs against
  // any module-level env caching we might add later).
  vi.resetModules();
  return import("@/lib/newsletter/newsletter-store");
}

describe("newsletter-store.upsertSubscriber", () => {
  it("creates the store file and records the first subscriber as `created:true`", async () => {
    const { upsertSubscriber, readAllSubscribers } = await freshStore();
    const result = await upsertSubscriber("hello@example.com");
    expect(result.created).toBe(true);
    const subs = await readAllSubscribers();
    expect(subs).toHaveLength(1);
    expect(subs[0]!.email).toBe("hello@example.com");
    expect(typeof subs[0]!.subscribedAt).toBe("string");
  });

  it("returns `created:false` for a second upsert of the same email (idempotent)", async () => {
    const { upsertSubscriber, readAllSubscribers } = await freshStore();
    await upsertSubscriber("dup@example.com");
    const second = await upsertSubscriber("dup@example.com");
    expect(second.created).toBe(false);
    const subs = await readAllSubscribers();
    expect(subs).toHaveLength(1);
  });

  it("stores distinct emails as separate records", async () => {
    const { upsertSubscriber, readAllSubscribers } = await freshStore();
    await upsertSubscriber("a@example.com");
    await upsertSubscriber("b@example.com");
    const subs = await readAllSubscribers();
    expect(subs.map((s) => s.email).sort()).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });
});

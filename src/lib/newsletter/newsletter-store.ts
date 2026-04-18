import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// cf-newsletter-footer: file-backed subscriber store. No external service
// yet — a JSON array under /data is enough for the Phase 3 cutover. The
// path is overridable via NEWSLETTER_STORE_PATH so tests (and potential
// serverless-writable volumes) can point elsewhere without code changes.

export type NewsletterSubscriber = {
  email: string;
  subscribedAt: string;
};

function storePath(): string {
  const override = process.env.NEWSLETTER_STORE_PATH;
  if (override) return override;
  return join(process.cwd(), "data", "newsletter-contacts.json");
}

async function readStore(): Promise<NewsletterSubscriber[]> {
  try {
    const buf = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(buf);
    return Array.isArray(parsed) ? (parsed as NewsletterSubscriber[]) : [];
  } catch (err: unknown) {
    // ENOENT = file not created yet (first write); any other error is a
    // real FS problem and should surface to the caller.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeStore(subs: NewsletterSubscriber[]): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(subs, null, 2) + "\n", "utf8");
}

export async function readAllSubscribers(): Promise<NewsletterSubscriber[]> {
  return readStore();
}

export async function upsertSubscriber(
  email: string,
): Promise<{ created: boolean }> {
  const subs = await readStore();
  const existing = subs.find((s) => s.email === email);
  if (existing) return { created: false };
  subs.push({ email, subscribedAt: new Date().toISOString() });
  await writeStore(subs);
  return { created: true };
}

// cf-newsletter-velo-wire: delegates to the Wix Velo HTTP function so
// subscribe writes survive Vercel serverless (no writable FS).
// cf-5pf8: added 8s timeout + explicit 429 rate-limit error class.

const FETCH_TIMEOUT_MS = 8_000;

type VeloResponse = {
  success: boolean;
  discountCode?: string;
  error?: string;
};

export class NewsletterRateLimitError extends Error {
  constructor() {
    super("rate-limited");
    this.name = "NewsletterRateLimitError";
  }
}

export async function upsertSubscriber(email: string): Promise<{ created: boolean }> {
  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) throw new Error("WIX_VELO_SITE_URL is not set");

  const res = await fetch(`${base.replace(/\/$/, "")}/_functions/mailingListSignups`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, source: "footer_newsletter" }),
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (res.status === 429) {
    throw new NewsletterRateLimitError();
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as VeloResponse;
      detail = body.error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`mailingListSignups HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  return { created: true };
}

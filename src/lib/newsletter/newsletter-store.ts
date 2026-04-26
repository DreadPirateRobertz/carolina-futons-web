// cf-newsletter-velo-wire: delegates to the Wix Velo HTTP function so
// subscribe writes survive Vercel serverless (no writable FS).

export async function upsertSubscriber(email: string): Promise<{ created: boolean }> {
  const base = process.env.WIX_VELO_SITE_URL;
  if (!base) throw new Error("WIX_VELO_SITE_URL is not set");

  const res = await fetch(`${base.replace(/\/$/, "")}/_functions/mailingListSignups`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, source: "footer_newsletter" }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`mailingListSignups HTTP ${res.status}: ${body}`);
  }

  return { created: true };
}

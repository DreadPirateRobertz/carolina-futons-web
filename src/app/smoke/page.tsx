import { getWixClient } from "@/lib/wix-client";

interface SmokeResult {
  ok: boolean;
  label: string;
  data?: unknown;
  error?: string;
  latencyMs: number;
}

async function runCheck(
  label: string,
  fn: () => Promise<unknown>
): Promise<SmokeResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return { ok: true, label, data, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      label,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export const dynamic = "force-dynamic";

export default async function SmokePage() {
  const checks = await Promise.all([
    runCheck("Product query (limit 1)", async () => {
      const client = getWixClient();
      const result = await client.products
        .queryProducts()
        .limit(1)
        .find();
      return {
        total: result.items.length,
        name: result.items[0]?.name ?? "(none)",
        id: result.items[0]?._id ?? "(none)",
      };
    }),

    runCheck("CMS: WelcomeVisitors (limit 1)", async () => {
      const client = getWixClient();
      const result = await client.items
        .query("WelcomeVisitors")
        .limit(1)
        .find();
      return {
        total: result.items.length,
        firstItem: result.items[0] ?? "(none)",
      };
    }),

    runCheck("CMS: Promotions (limit 1)", async () => {
      const client = getWixClient();
      const result = await client.items
        .query("Promotions")
        .limit(1)
        .find();
      return {
        total: result.items.length,
        firstItem: result.items[0] ?? "(none)",
      };
    }),

    runCheck("Velo HTTP function: /_functions/health (CORS)", async () => {
      const base = process.env.WIX_VELO_SITE_URL ?? "https://www.carolinafutons.com";
      const url = `${base}/_functions/health`;
      const res = await fetch(url, { cache: "no-store" });
      const corsHeader = res.headers.get("access-control-allow-origin");
      return {
        url,
        status: res.status,
        corsAllowOrigin: corsHeader ?? "(none)",
      };
    }),
  ]);

  const allOk = checks.every((c) => c.ok);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">
        /smoke — Wix Headless SDK Integration
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {new Date().toISOString()} | Status:{" "}
        <span className={allOk ? "text-green-400" : "text-red-400"}>
          {allOk ? "ALL PASS" : "SOME FAILED"}
        </span>
      </p>

      <div className="space-y-4">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`p-4 rounded border ${
              check.ok
                ? "border-green-800 bg-green-950/30"
                : "border-red-800 bg-red-950/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={check.ok ? "text-green-400" : "text-red-400"}>
                {check.ok ? "PASS" : "FAIL"}
              </span>
              <span className="font-semibold">{check.label}</span>
              <span className="text-gray-500 text-xs ml-auto">
                {check.latencyMs}ms
              </span>
            </div>
            {check.ok && (
              <pre className="text-xs text-gray-400 overflow-auto">
                {JSON.stringify(check.data, null, 2)}
              </pre>
            )}
            {check.error && (
              <p className="text-sm text-red-400">{check.error}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

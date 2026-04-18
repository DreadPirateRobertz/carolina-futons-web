import { optionalEnv } from "@/lib/env";

export type VeloCallArgs = {
  method: string;
  args: unknown[];
  accessToken?: string;
  signal?: AbortSignal;
};

export class VeloRpcError extends Error {
  readonly status: number;
  readonly method: string;
  readonly body: string;
  constructor(method: string, status: number, body: string) {
    super(`velo ${method} failed: HTTP ${status}`);
    this.name = "VeloRpcError";
    this.method = method;
    this.status = status;
    this.body = body;
  }
}

export async function callVelo<T>({
  method,
  args,
  accessToken,
  signal,
}: VeloCallArgs): Promise<T> {
  const base = optionalEnv("WIX_VELO_SITE_URL").replace(/\/$/, "");
  const res = await fetch(`${base}/_functions/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ args }),
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new VeloRpcError(method, res.status, body);
  }

  return (await res.json()) as T;
}

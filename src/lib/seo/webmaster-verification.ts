import type { Metadata } from "next";

// Returns the Next.js `verification` metadata block populated from env vars.
// Set GOOGLE_SITE_VERIFICATION and/or BING_SITE_VERIFICATION in Vercel before
// the cf-3qt.8 DNS cutover so the tokens are already live when GSC / Bing WMT
// ask for confirmation. If both vars are absent the function returns undefined
// and no <meta name="google-site-verification"> tags are emitted.
export function resolveVerification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION || undefined;
  const bing = process.env.BING_SITE_VERIFICATION || undefined;

  if (!google && !bing) return undefined;

  return {
    ...(google && { google }),
    ...(bing && { other: { "msvalidate.01": bing } }),
  };
}

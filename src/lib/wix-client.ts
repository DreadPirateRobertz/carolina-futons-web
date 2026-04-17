import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";

export function getWixClient() {
  const clientId = process.env.WIX_CLIENT_ID_HEADLESS;

  if (!clientId) {
    throw new Error(
      "WIX_CLIENT_ID_HEADLESS is not set. Add it to .env.local or Vercel env vars."
    );
  }

  return createClient({
    modules: { products, items, members },
    auth: OAuthStrategy({ clientId }),
  });
}

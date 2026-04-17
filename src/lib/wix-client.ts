import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";

const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

if (!clientId) {
  throw new Error(
    "NEXT_PUBLIC_WIX_CLIENT_ID is not set. Add it to .env.local or Vercel env vars."
  );
}

export function getWixClient() {
  return createClient({
    modules: { products, items, members },
    auth: OAuthStrategy({ clientId: clientId! }),
  });
}

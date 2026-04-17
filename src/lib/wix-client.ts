import { createClient, OAuthStrategy } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { currentCart, checkout, orders } from "@wix/ecom";
import { redirects } from "@wix/redirects";

export function getWixClient() {
  const clientId = process.env.WIX_CLIENT_ID_HEADLESS;

  if (!clientId) {
    throw new Error(
      "WIX_CLIENT_ID_HEADLESS is not set. Add it to .env.local or Vercel env vars."
    );
  }

  return createClient({
    modules: {
      products,
      collections,
      items,
      members,
      currentCart,
      checkout,
      orders,
      redirects,
    },
    auth: OAuthStrategy({ clientId }),
  });
}

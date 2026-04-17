import { createClient, OAuthStrategy } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { currentCart, checkout, orders } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { env } from "@/lib/env";

export function getWixClient() {
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
    auth: OAuthStrategy({ clientId: env("WIX_CLIENT_ID_HEADLESS") }),
  });
}

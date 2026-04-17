import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { env } from "@/lib/env";

export function getWixClient() {
  return createClient({
    modules: { products, items, members },
    auth: OAuthStrategy({ clientId: env("WIX_CLIENT_ID_HEADLESS") }),
  });
}

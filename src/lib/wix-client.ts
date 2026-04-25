import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { currentCart, checkout, orders } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { posts } from "@wix/blog";
import { env } from "@/lib/env";

const MODULES = {
  products,
  collections,
  items,
  members,
  currentCart,
  checkout,
  orders,
  redirects,
  posts,
};

export function getWixClient() {
  return createClient({
    modules: MODULES,
    auth: OAuthStrategy({ clientId: env("WIX_CLIENT_ID_HEADLESS") }),
  });
}

export function getWixClientWithTokens(tokens?: Tokens) {
  return createClient({
    modules: MODULES,
    auth: OAuthStrategy({
      clientId: env("WIX_CLIENT_ID_HEADLESS"),
      tokens,
    }),
  });
}

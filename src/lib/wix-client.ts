import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
// cf-g6vx: direct sub-package imports skip the @wix/<umbrella> barrels.
// The umbrella packages (@wix/stores, @wix/ecom, @wix/members, @wix/data,
// @wix/blog, @wix/identity) re-export every sub-namespace via
// `import * as X from "@wix/auto_sdk_*"`, which is not effectively
// tree-shakeable — bundlers retain the full namespace import graph and
// pull every admin endpoint of the umbrella into the build (BulkUpdateTag,
// GiftCard CRUD, abandoned-checkouts, data-sync-jobs, etc). Importing the
// individual sub-package modules directly bypasses the barrel and lets the
// bundler ship only the Wix surfaces this app actually calls.
import * as products from "@wix/auto_sdk_stores_products";
import * as collections from "@wix/auto_sdk_stores_collections";
// @wix/wix-data-items-sdk is CJS — namespace import required for ESM compat.
import * as items from "@wix/wix-data-items-sdk";
import * as members from "@wix/auto_sdk_members_members";
import * as currentCart from "@wix/auto_sdk_ecom_current-cart";
import * as checkout from "@wix/auto_sdk_ecom_checkout";
import * as orders from "@wix/auto_sdk_ecom_orders";
import * as redirects from "@wix/auto_sdk_redirects_redirects";
import * as posts from "@wix/auto_sdk_blog_posts";
import * as recovery from "@wix/auto_sdk_identity_recovery";
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
  recovery,
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

// Thin typed accessors for the Wix Members module.
// Real auth wiring (session exchange, cookie storage) lands in Phase 3 (rennala).
// Until then, these helpers surface the types other modules need so imports
// don't have to reach into the raw @wix/members package.
import { getWixClient } from "@/lib/wix-client";

export async function getCurrentMember() {
  const client = getWixClient();
  const result = await client.members.getCurrentMember();
  return result.member ?? null;
}

export type WixMember = NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>;

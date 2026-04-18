import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Tokens } from "@wix/sdk";
import { SESSION_COOKIE_NAME, parseSessionCookie } from "./session";
import { getWixClientWithTokens } from "@/lib/wix-client";

export type MemberSession = {
  tokens: Tokens;
  accessToken: string;
  memberId: string;
};

let memberIdCache: WeakMap<Tokens, string> | null = null;

async function resolveMemberId(tokens: Tokens): Promise<string> {
  memberIdCache ??= new WeakMap<Tokens, string>();
  const hit = memberIdCache.get(tokens);
  if (hit) return hit;

  const client = getWixClientWithTokens(tokens);
  const { member } = await client.members.getCurrentMember();
  const id = member?._id;
  if (!id) {
    throw new Error("getCurrentMember returned no member id for a member-role token");
  }
  memberIdCache.set(tokens, id);
  return id;
}

export async function readSessionTokens(): Promise<Tokens | null> {
  const jar = await cookies();
  return parseSessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const tokens = await readSessionTokens();
  if (!tokens || tokens.refreshToken.role !== "member") return null;
  try {
    const memberId = await resolveMemberId(tokens);
    return { tokens, accessToken: tokens.accessToken.value, memberId };
  } catch {
    return null;
  }
}

export async function getMemberId(): Promise<string | null> {
  return (await getMemberSession())?.memberId ?? null;
}

export async function withMember<T>(
  fn: (m: MemberSession) => Promise<T>,
): Promise<T> {
  const m = await getMemberSession();
  if (!m) redirect("/api/auth/session");
  return fn(m);
}

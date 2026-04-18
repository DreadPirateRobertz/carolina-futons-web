// TODO(cf-3qt.3.2): Delete this file on rebase once rennala's PR #12
// (feat/cf-3qt-3-phase3-impl) merges to main. It adds src/lib/auth/member.ts
// exporting the real getMemberSession. Swap imports in this PR to
// `@/lib/auth/member` when that happens.
//
// Shape mirrors rennala's PR #12 contract so no call-site changes are
// required on rebase — only the import path moves.
import type { Tokens } from "@wix/sdk";

export type MemberSession = {
  tokens: Tokens;
  accessToken: string;
  memberId: string;
};

export async function getMemberSession(): Promise<MemberSession | null> {
  return null;
}

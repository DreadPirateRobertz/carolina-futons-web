// cfw-d7k: regression guard against `dark:text-cf-cream` re-introduction.
//
// WHY: globals.css redefines `--cf-cream` to the dark CARD SURFACE color
// (#263545) in dark mode. Using `dark:text-cf-cream` as a text class puts
// dark-navy text on dark-navy surfaces — effectively invisible. Wave-2
// dark-mode work (commit 6ce5383, cf-yq3h+cf-7tkf) shipped 53 instances
// of this anti-pattern across 18 files; this sweep removed them.
//
// This test runs a repo-scoped search and fails if the class re-appears
// in any production source file. The cf-2oku a11y test (which already
// asserts AccountSignIn does NOT contain the class) is allow-listed
// because it owns the negative-assertion regex literals.
//
// Source-string grep is intentionally simple (no AST parse) — it catches
// the exact wave-2 regression pattern without needing to understand class
// composition or Tailwind variant ordering.

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const SRC_ROOT = join(__dirname, "..");
const FORBIDDEN_PATTERN = "dark:text-cf-cream";
const ALLOWED_FILES = new Set([
  // cf-2oku a11y test asserts the absence of this token in AccountSignIn.
  // Its regex literals legitimately contain the forbidden string.
  "src/__tests__/cf-2oku-account-a11y.test.tsx",
  // This regression-guard test itself.
  "src/__tests__/cfw-d7k-dark-mode-token-regression.test.ts",
]);

describe("cfw-d7k — dark-mode token-swap regression guard", () => {
  it("no production source file contains `dark:text-cf-cream` (including opacity + hover variants)", () => {
    // grep -r returns non-zero exit when there are no matches; the catch
    // path is the happy path. When grep finds matches, we filter the
    // allow-list and assert the remainder is empty.
    let raw: string;
    try {
      raw = execSync(
        `grep -rln "${FORBIDDEN_PATTERN}" "${SRC_ROOT}" --include="*.tsx" --include="*.ts"`,
        { encoding: "utf8" },
      ).trim();
    } catch (err) {
      // grep -r exit code 1 = no matches (the desired state).
      const e = err as { status?: number; stdout?: string };
      if (e.status === 1) return;
      throw err;
    }
    if (raw === "") return;

    const cwd = join(SRC_ROOT, ".."); // project root
    const offenders = raw
      .split("\n")
      .map((p) => p.replace(`${cwd}/`, ""))
      .filter((p) => !ALLOWED_FILES.has(p));

    expect(
      offenders,
      `dark:text-cf-cream is a CARD SURFACE token (dark navy) in dark mode — using it as a text class produces invisible text. See bead cfw-d7k. Found in:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

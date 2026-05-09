// cfw-sbl: meta-test that scans the codebase for getSiteContent("...")
// calls and asserts every literal-string key matches the
// SITE_CONTENT_KEY_PATTERN enforced by cfw-6qd.12 at the writer endpoint.
//
// Why grep-style: every reader call is server-side and adding instrumentation
// runtime-side would be heavier than this. The signal we want is "did anyone
// introduce a new camelCase / typo'd key" — a one-time scan at test time
// catches that drift before it ships.
//
// Limitation: only static string literals. Template-literal keys (e.g.
// `home.value-props.${i}.title`) are checked by replacing `${expr}` with a
// numeric placeholder before regex testing — that mirrors how the runtime
// constructs the key.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

// cfw-7k0: imports the canonical regex now that cfw-6qd.12 is on main.
// The original cfw-sbl file inlined the pattern to stay order-independent
// against the cfw-6qd.12 merge — that constraint is gone, so this test,
// the seed test (site-content-seed.test.ts, which already imports), the
// runtime endpoint validator, and any future caller all share one
// definition.
import { SITE_CONTENT_KEY_PATTERN } from "@/lib/cms/owner-edit-validation";

const SRC_ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"] as const;
const FILE_EXT = /\.(?:ts|tsx)$/;
const SKIP_DIR_NAMES = new Set(["__tests__", "node_modules"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (FILE_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Match getSiteContent("key") OR getSiteContent(`tpl.${e}.literal`) OR
// getSiteContent('key', ...). Capture the raw quoted argument including
// any template-literal syntax — the test expands ${...} placeholders to
// "0" so the regex check sees what the runtime actually sends to Wix.
const CALL_PATTERN =
  /getSiteContent\s*\(\s*(['"`])([^'"`]+)\1/g;

function expandTemplate(raw: string): string {
  // Replace any ${...} expression with "0" — runtime fills these with
  // numeric indexes (e.g. value-props.0.title). The hyphenated convention
  // we're enforcing accepts numeric segments either way.
  return raw.replace(/\$\{[^}]+\}/g, "0");
}

describe("getSiteContent call sites — SITE_CONTENT_KEY_PATTERN conformance (cfw-sbl)", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(SRC_ROOT, d)));

  it("scans a non-empty set of source files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every static key passed to getSiteContent matches the convention", () => {
    const violations: Array<{ file: string; key: string }> = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(CALL_PATTERN)) {
        const rawKey = match[2];
        const expanded = expandTemplate(rawKey);
        if (!SITE_CONTENT_KEY_PATTERN.test(expanded)) {
          violations.push({
            file: file.slice(SRC_ROOT.length + 1),
            key: rawKey,
          });
        }
      }
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});

// cfw-66o.14: meta-test — every key in seed-data.json must have at least one
// getSiteContent call wired in src/. Catches seed/code drift before prod.
//
// Two coverage modes:
//   Literal: key appears as a string literal anywhere in src/ (handles static
//            calls and constant-based calls like SUN_TUE_KEY = "visit.hours.sun-tue")
//   Template: key matches a getSiteContent template-literal pattern extracted
//             from source (handles shop.${category.slug}.* and home.value-props.${i}.*)
//
// No Wix/Next.js mocking — pure filesystem read.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(__dirname, "../..");
const SEED_PATH = join(ROOT, "scripts/provision-site-content/seed-data.json");

type Row = { key: string; value: string };

function loadSeedRows(): Row[] {
  return JSON.parse(readFileSync(SEED_PATH, "utf8")).rows as Row[];
}

function* walkTs(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "__tests__") continue;
      yield* walkTs(full);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

// Collect getSiteContent literal keys (static first args, including multiline calls).
// `\s*` absorbs optional newline+indent between `getSiteContent(` and the string arg.
function extractLiteralKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const re = /getSiteContent\(\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) keys.add(m[1]);
  return keys;
}

// Convert getSiteContent template-literal first args to regex matchers.
// e.g. `shop.${category.slug}.description` → /^shop\.[^.]+\.description$/
function extractTemplatePatterns(content: string): RegExp[] {
  const patterns: RegExp[] = [];
  const re = /getSiteContent\(\s*`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const tpl = m[1];
    if (!tpl.includes("${")) continue;
    const regexStr = tpl
      .replace(/\$\{[^}]+\}/g, "[^.]+")
      .replace(/\./g, "\\.");
    patterns.push(new RegExp(`^${regexStr}$`));
  }
  return patterns;
}

// Detect constant-based calls: `const VAR = "key"; ... getSiteContent(VAR, ...)`
// Needed for cases like SUN_TUE_KEY / WED_SAT_KEY in showroom-hours.ts.
function extractConstantKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const constRe = /const\s+(\w+)\s*=\s*["']([a-z][a-z0-9.\-]*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = constRe.exec(content)) !== null) {
    const [, varName, value] = m;
    if (
      content.includes(`getSiteContent(${varName},`) ||
      content.includes(`getSiteContent(${varName} `)
    ) {
      keys.add(value);
    }
  }
  return keys;
}

function buildSourceIndex(): { literalKeys: Set<string>; constantKeys: Set<string>; templatePatterns: RegExp[] } {
  const allContent: string[] = [];
  for (const file of walkTs(join(ROOT, "src"))) {
    allContent.push(readFileSync(file, "utf8"));
  }
  const combined = allContent.join("\n");

  return {
    literalKeys: extractLiteralKeys(combined),
    constantKeys: extractConstantKeys(combined),
    templatePatterns: extractTemplatePatterns(combined),
  };
}

function isKeyWired(
  key: string,
  literalKeys: Set<string>,
  constantKeys: Set<string>,
  templatePatterns: RegExp[],
): boolean {
  if (literalKeys.has(key) || constantKeys.has(key)) return true;
  return templatePatterns.some((re) => re.test(key));
}

describe("site-content seed ↔ src/ getSiteContent coverage (cfw-66o.14)", () => {
  const rows = loadSeedRows();
  const { literalKeys, constantKeys, templatePatterns } = buildSourceIndex();

  it("every seed key has a getSiteContent call wired in src/", () => {
    const orphaned = rows
      .filter((r) => !isKeyWired(r.key, literalKeys, constantKeys, templatePatterns))
      .map((r) => r.key);

    expect(
      orphaned,
      `Seed keys with no getSiteContent call in src/:\n  ${orphaned.join("\n  ")}`,
    ).toHaveLength(0);
  });

  it(`seed has exactly ${rows.length} rows (guard against accidental seed edits)`, () => {
    expect(rows).toHaveLength(58);
  });
});

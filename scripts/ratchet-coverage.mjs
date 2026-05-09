#!/usr/bin/env node
/**
 * ratchet-coverage.mjs — raise vitest coverage thresholds to current floor.
 *
 * Reads coverage/coverage-summary.json (produced by vitest v8 with the
 * `json-summary` reporter), compares each metric against the corresponding
 * threshold in vitest.config.ts, and if the measured value's integer floor
 * is higher than the configured threshold, rewrites the threshold to the
 * new floor. Never lowers a threshold.
 *
 * Exit codes:
 *   0 — vitest.config.ts was updated (or up-to-date — see RATCHET_CHANGED env)
 *   2 — coverage summary missing or unparseable
 *   3 — vitest.config.ts thresholds block missing or unparseable
 *
 * Side outputs:
 *   - vitest.config.ts modified in place when ratchet applies
 *   - JSON summary written to stdout: {changed:bool, before:{...}, after:{...}, actual:{...}}
 *   - GITHUB_OUTPUT (when set) gets `changed=true|false` for workflow gating
 *
 * Run manually:
 *   npx vitest run --coverage --coverage.reporter=json-summary
 *   node scripts/ratchet-coverage.mjs
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const summaryPath = resolve(repoRoot, "coverage/coverage-summary.json");
const configPath = resolve(repoRoot, "vitest.config.ts");

const METRICS = ["statements", "branches", "functions", "lines"];

function die(code, msg) {
  console.error(`ratchet-coverage: ${msg}`);
  process.exit(code);
}

if (!existsSync(summaryPath)) {
  die(
    2,
    `${summaryPath} missing — run vitest with --coverage.reporter=json-summary first`,
  );
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = summary.total;
if (!total) die(2, "coverage-summary.json has no .total");

const actual = Object.fromEntries(
  METRICS.map((m) => [m, total[m]?.pct]).filter(([, v]) => typeof v === "number"),
);
if (Object.keys(actual).length !== METRICS.length) {
  die(2, `coverage-summary.json missing pct for one of: ${METRICS.join(", ")}`);
}

let configSrc = readFileSync(configPath, "utf8");

// Parse the thresholds block — it is the only place METRIC: <integer> appears
// inside a `thresholds: { ... }` object literal in vitest.config.ts. Match with
// dotAll so multi-line bodies work.
const thresholdsMatch = configSrc.match(/thresholds:\s*\{([\s\S]*?)\}/);
if (!thresholdsMatch) {
  die(3, "vitest.config.ts has no thresholds: { ... } block");
}
const thresholdsBlock = thresholdsMatch[1];

const before = {};
for (const m of METRICS) {
  const re = new RegExp(`${m}:\\s*(\\d+)`);
  const found = thresholdsBlock.match(re);
  if (!found) die(3, `thresholds block missing ${m}: <number>`);
  before[m] = Number(found[1]);
}

// Floor of measured % — never overshoot. e.g. 76.47% → 76. If new floor is
// strictly greater than current threshold, ratchet to new floor.
const after = { ...before };
for (const m of METRICS) {
  const newFloor = Math.floor(actual[m]);
  if (newFloor > before[m]) after[m] = newFloor;
}

const changed = METRICS.some((m) => after[m] !== before[m]);

if (changed) {
  let newBlock = thresholdsBlock;
  for (const m of METRICS) {
    if (after[m] !== before[m]) {
      newBlock = newBlock.replace(
        new RegExp(`(${m}:\\s*)(\\d+)`),
        `$1${after[m]}`,
      );
    }
  }
  const newConfig = configSrc.replace(thresholdsBlock, newBlock);
  writeFileSync(configPath, newConfig);
}

const result = { changed, before, after, actual };
console.log(JSON.stringify(result, null, 2));

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `summary=${Buffer.from(JSON.stringify(result)).toString("base64")}\n`,
  );
}

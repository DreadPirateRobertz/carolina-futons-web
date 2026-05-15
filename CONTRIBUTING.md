# Contributing to Carolina Futons (Web)

This is the Next.js storefront for Carolina Futons — `App Router`, server components by default, TypeScript everywhere, Wix SDK for product/order/CMS data. Tests run via vitest. Merges land through the Refinery merge queue.

Sister rigs: `cfutons` (Velo / Wix Studio), `cfutons_mobile` (React Native).

---

## Contribution Workflow

1. **Claim a bead** — `bd ready --unassigned --priority 0,1` to find available work. `bd update <id> --claim` when starting (atomic — sets assignee + status). Polecats can't `gt sling` themselves; the `--claim` shortcut is the canonical self-assign path.
2. **Create a branch** from `origin/main` — `git checkout -b <type>/<bead-id>-<short-desc>` or `polecat/<name>/<bead-id>` for dispatched polecats. Never PR from `main`.
3. **TDD first** — write failing tests before implementation. See [TDD Standards](#tdd-standards).
4. **Open a PR** — title format: `type(bead-id): short description`. Fill the full test-plan checklist.
5. **CI must be green** before requesting review — no exceptions.
6. **5-agent review** — every PR gets a multi-agent review pass (`/ultrareview <PR#>` triggers the cloud reviewers). Resolve all CRITICAL + MAJOR findings.
7. **All test-plan boxes checked** before merge. Unchecked = tests not done = blocked.
8. **Merge path** — Refinery merge queue via `gt done --pre-verified --issue <bead-id> --target main`. Direct `gh pr merge` is reserved for explicit Mayor enforce_admins-off windows and still requires the 5-agent gate.
9. **Close bead** — Refinery closes the work bead after successful merge. Polecats don't close their own.

### Branch Naming

```bash
feat/cfw-abc-short-description    # new feature
fix/cfw-abc-short-description     # bug fix
test/cfw-abc-short-description    # tests only
chore/cfw-abc-short-description   # deps, cleanup
docs/cfw-abc-short-description    # documentation
perf/cfw-abc-short-description    # performance
rescue/cfw-abc-short-description  # cherry-pick from a dead branch

polecat/<name>/<bead-id>          # dispatched polecat work
```

**Never PR from `main`.** Always a dedicated branch per bead.

---

## TDD Standards

**Test-Driven Development is mandatory.** No implementation without a failing test first.

### The cycle

```
1. Write a failing test  →  2. Run it (verify FAIL)  →  3. Write minimal implementation
4. Run tests (verify PASS)  →  5. Refactor  →  6. Commit
```

### Coverage thresholds

Carrying the cfutons-rig baseline:

- **Lines**: ≥91%
- **Branches**: ≥85%
- **Functions**: ≥88%
- **Statements**: ≥90%

vitest config enforces — fix coverage before committing.

### What to test (required — not optional)

- **Happy path** — the normal success case
- **Empty / null inputs** — `null`, `undefined`, `[]`, `{}`, missing optional fields
- **Auth failure** — unauthenticated + unauthorized requests against gated routes
- **Outlier / edge cases** — boundary values, race conditions, concurrent calls
- **Error propagation** — Wix SDK failures, network drops, downstream timeouts, malformed payloads
- **Graceful degradation** — one operation fails, others continue (`Promise.allSettled` not `Promise.all`); reader returns fallback when CMS is unreachable

**Happy-path-only tests get rejected at review.** If your `describe` block has a single `it()`, you are not done.

### Test layout

- `src/__tests__/` — the canonical location vitest scans.
- Co-located `*.test.ts` / `*.test.tsx` next to the module — also picked up; use for tight unit-level tests where the module is self-contained.
- Snapshot fixtures live under `src/__tests__/fixtures/` — keep them deterministic (no timestamps, no random IDs, no live Wix calls).

### Running tests

```bash
npm test                               # full suite
npx vitest run src/__tests__/foo.test.tsx   # single file
npm run typecheck                      # tsc --noEmit
npm run lint                           # eslint
npm run build                          # next build (catches RSC issues)
```

CI runs all four. Run the same locally before requesting review.

---

## TSDoc-Style Function Briefs

Every exported function, server action, and route handler **must** carry a TSDoc brief. TypeScript types already encode parameter and return shapes, so the doc focuses on *meaning*: what the function returns, why the design is non-obvious, what failure modes exist.

```ts
/**
 * Read a single piece of owner-editable copy.
 *
 * Always returns a string — falls back to `fallback` (or "") when Wix is
 * unreachable, the SiteContent collection isn't provisioned yet, or the key
 * isn't present.
 *
 * @param key - Dotted-path SiteContent key (e.g. "footer.tagline").
 * @param fallback - Value returned when the key is missing.
 * @returns The owner-edited value, or `fallback`.
 *
 * WHY: the reader is fail-open so refactor PRs can ship one string at a
 * time — call sites work today (return fallback) and switch to the live
 * value the moment Brenda fills in the row.
 */
export async function getSiteContent(
  key: string,
  fallback = "",
): Promise<string> { … }
```

**Required fields:**
- Description (1–2 sentences explaining what the function does and any non-obvious return-shape contract)
- `@param` for any arg where the type alone isn't self-explanatory (skip for `key: string` if "key" is in the description)
- `@returns` — describe the meaning, not the type
- `@throws` — list error conditions that callers must handle
- `WHY` — when the design choice isn't obvious from the code (workarounds, platform quirks, perf trade-offs)

---

## Comment Conventions

**Comments explain WHY, not WHAT.** The code already says what.

```ts
// BAD — describes what the code does (obvious from reading it)
// Loop through products and fetch color choices
for (const p of products) { … }

// GOOD — explains why this approach was chosen
// Wix's queryProducts response strips productOptions, so we batch a
// per-slug getProduct fetch to surface color choices for the FilterFirst
// "Available in N colors" badge. Behind Next's route-level cache — cost
// is bounded to N <= categoryCount * 24.
```

**When to add a comment:**
- Non-obvious business rule or constraint
- Workaround for a platform limitation (Wix SDK shape, Next RSC boundary, Vercel deploy quirk)
- Why a simpler approach was rejected
- TOCTOU / race-condition prevention
- Bead reference for context (`cfw-vxb: tightened cache to revalidate=300s for cross-request hit rate`)

**Skip:**
- Variable declarations
- Obvious control flow
- Restating what the function does (use TSDoc for that)

---

## Logging Standards

**Smart logging only** — log errors and meaningful state transitions. Routine ops stay silent.

```ts
// BAD — noise
console.log("Fetching products");
console.log(`Got ${products.length} products`);

// GOOD — signal
console.error("[wix-products] queryProducts failed", { collectionId, err });
console.info("[revalidate] processed", { correlationId, tags, eventType });
```

**Format:** `[module-name] message — optional context object`

**Always log:**
- Errors with full context (`console.error`)
- Final aggregate results of batch / webhook handlers
- Unexpected state (e.g., query returned null when a row was expected)
- Correlation IDs at request boundaries (see `src/app/api/revalidate/route.ts`)

**Never log:**
- Individual items in a loop (log the aggregate)
- Successful reads
- Auth checks passing
- PII in cleartext — hash or redact (see cfw-coc: subscriber email hashing pattern)

Heavier observability (Sentry) goes through `src/lib/wix/errors.ts:logWixFailure` which handles Sentry serverless-ship flushing.

---

## CI Gate

CI must be green before requesting review. No exceptions.

Workflow runs on every PR targeting `main`:

- **lint-typecheck-test** — `npm run lint && npm run typecheck && npm test`
- **e2e** — Playwright suite against a built preview
- **Vercel Preview** — production-shaped build deploy
- **CodeQL** — security analysis (weekly + on PR)

Verify locally before pushing:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

If CI is red: **do not ask for review**. Fix the failure first.

---

## PR Description Format

Every PR must include:

```markdown
## Summary
- Bullet 1: what changed and why
- Bullet 2: ...

## Coverage (new/modified files)
- `src/path/file.ts`: X% lines, Y% functions, Z% branches

## Test plan
- [ ] `npx vitest run src/__tests__/foo.test.tsx` — N tests passing
- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean
- [ ] Edge case X tested (describe what)
- [ ] Error path Y tested (describe what)
- [ ] [Manual smoke if UI: opened preview deploy, verified Z]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**All `- [ ]` items must be checked before merge.** Unchecked = not done = blocked.

---

## Security

- **`import "server-only";`** at the top of any module that wraps a privileged SDK, a secret-reading helper, or anything that must never bundle into a client component. See `src/lib/wix/products.ts` (cfw-75m) and `src/lib/cms/site-content.ts` (cf-4mol).
- **Owner-gated routes** use `getOwnerSession()` from `@/lib/auth/owner` (cfw-wef) and return 401/403 JSON for fetch callers (no redirects).
- **Webhook auth** — HMAC-verified, replay-protected. See `src/app/api/revalidate/route.ts` (cfw-r5x): `verifySignature` with `timingSafeEqual`, 5-min replay window via `ts` field.
- **SiteContent writes** go through the validation + sanitisation pipeline at `/api/admin/site-content`: `validateOwnerEditKey` (cfw-6qd.12) → `sanitizeOwnerEditValue` control-byte + URL-scheme strip (cfw-6qd.13) → `sanitizeOwnerHtml` DOMPurify allowlist (cfw-qyy). Never bypass; never bolt new admin routes onto Wix Data without the same stack.
- **PII** — hash or redact before logging. See cfw-coc subscriber-email hashing + cross-rig payload redaction.
- **Wix SDK imports** — use direct sub-package imports (`@wix/stores`, `@wix/data`, `@wix/auto_sdk_*`) per cf-g6vx, not the umbrella `@wix/sdk-react` which leaks the admin SDK into client chunks (~4 MB).
- **Server-only secrets** — read via `src/lib/env.ts`. Never expose to a `"use client"` module.

---

## Next.js / React Conventions

- **Server components by default.** Add `"use client"` only when the module uses browser APIs (`useState`, `useEffect`, `framer-motion` hooks, etc.).
- **Async server components** can call `getSiteContent` and Wix readers directly. Pass resolved values down as props into client components rather than recreating an RSC boundary inside them. See `src/app/layout.tsx` for the canonical pattern (Footer + AnnouncementBar threading).
- **`force-dynamic`** only when the route genuinely needs per-request rendering. Audit your route's `export const dynamic` — over-using it loses ISR + the Wix snapshot cache.
- **Metadata exports** — every public route exports a `metadata` object (or `generateMetadata`). Include `alternates: { canonical: "/<path>" }` so post-cutover canonicals are pinned (cf-bbo8 + cf-89fb).
- **Wix Data cache tags** — every reader sets a stable cache tag and revalidates via `/api/revalidate`. SiteContent uses `SITE_CONTENT_CACHE_TAG = "site-content"`; webhooks map collectionId → tag in the revalidate route (cfw-r5x).

---

## Wix SDK Patterns

- **Data reads**: `listCollectionItems(collectionId, max)` in `src/lib/wix/data.ts`. Wrap in `unstable_cache` with a `revalidate` window + tag (see `src/lib/cms/site-content.ts:loadSerializedSiteContent` for the canonical pattern).
- **Member tokens**: write paths take `tokens` from `getOwnerSession()` so Wix collection permissions evaluate against the actor, not the site.
- **Error classification**: `classifyAuthInputError` + `AUTH_INPUT_ERROR_MESSAGES` in `src/lib/auth/sdk-error.ts` map Wix SDK error codes to user-friendly messages. Use them; don't rebuild the table.
- **Sentry**: route failures that aren't user-input go through `logWixFailure("module/op", "method", err)` which handles serverless flush.

---

## Questions?

- Check open beads: `bd list --status=open`
- Check ready unassigned work: `bd ready --unassigned --exclude-type epic,molecule`
- Check open PRs: `gh pr list --state open`
- Polecat self-assign: `bd update <id> --claim` then branch + work + `gt done --pre-verified --issue <id> --target main`
- Reach Mayor: `gt mail send mayor/ -s "subject" -m "body"`
- Reach Stilgar (PM): `gt nudge cfutons/crew/stilgar 'message'`

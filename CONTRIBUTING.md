# Contributing to Carolina Futons Web

**Canonical process doc:** [DreadPirateRobertz/gastown/CONTRIBUTING.md](https://github.com/DreadPirateRobertz/gastown/blob/main/CONTRIBUTING.md)

This file covers the cfw-specific workflow layered on top of those fundamentals.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Vitest · Playwright · Wix Headless SDK

---

## Contribution Workflow

1. **Claim a bead** — `bd ready` to find available work. `bd update <id> --status=in_progress` when starting.
2. **Branch from main** — never PR from `main` directly. See branch naming below.
3. **TDD first** — write failing tests before implementation. See [docs/TDD-STANDARDS.md](./docs/TDD-STANDARDS.md).
4. **Open a PR** — title: `type(bead-id): short description`. Fill the test-plan checklist.
5. **CI must be green** — lint + typecheck + tests + Vercel. No exceptions.
6. **5-agent review** — every PR gets all five agents (see [5-Agent Review](#5-agent-review)). Confidence filter ≥80.
7. **Check all test-plan boxes** — unchecked = tests not done = merge blocked.
8. **Batch merge** — squash to `main` in batches of 3–5 (Vercel build conservation, cf-ukc6).
9. **Close bead** — `bd close <id>` after merge.

### Branch naming

```
feat/cf-abc-short-description
fix/cf-abc-short-description
test/cf-abc-short-description
chore/cf-abc-short-description
docs/cf-abc-short-description
```

---

## TDD Standards

See **[docs/TDD-STANDARDS.md](./docs/TDD-STANDARDS.md)** for the full spec.

**Summary:** Write a failing test first. Every test file must cover happy path **and** at least one of: empty input, error path, boundary value, or race condition. Happy-path-only test suites are rejected at review.

**Run tests:**

```bash
cd /path/to/carolina-futons-web
npm test               # vitest run
npm run test:watch     # vitest
npm run test:coverage  # vitest --coverage
npm run test:e2e       # playwright
```

---

## JSDoc Standards

Every exported function, React component, and Server Action **must** have a JSDoc brief.

```ts
/**
 * Fetches a product by its URL slug, throws if not found.
 *
 * @param slug - Product URL slug (e.g. "kingston-futon-frame")
 * @returns The full product record including variants and media
 * @throws {WixNotFoundError} If no product matches the slug
 */
export async function getProductBySlug(slug: string): Promise<WixProduct> {
```

**Required fields:** one-line description, `@param` for each argument, `@returns`, `@throws` if applicable.

**WHY comments** for non-obvious decisions (see [docs/TDD-STANDARDS.md §4](./docs/TDD-STANDARDS.md#4-comment-conventions)).

---

## 5-Agent Review

Every PR must complete a 5-agent review before merge. Dispatch all five in a single parallel batch:

| Agent | Focus |
|---|---|
| `pr-review-toolkit:code-reviewer` | Correctness, logic errors, security |
| `pr-review-toolkit:silent-failure-hunter` | Swallowed errors, bad fallbacks |
| `pr-review-toolkit:code-simplifier` | Redundancy, over-engineering |
| `pr-review-toolkit:comment-analyzer` | Comment accuracy, no stale docs |
| `pr-review-toolkit:pr-test-analyzer` | Coverage gaps, outlier paths missing |

**Rules:**
- Post reviews as PR comments with `gh pr review <n> --comment --body "..."`.
- Label each review `agent-name (N/5)` in the body.
- Filter findings at confidence ≥80. Below 80 = note it, don't block.
- CRITICAL findings must be fixed before merge. No exceptions.
- List all 5 reviewers in the PR description.

---

## PR Description Template

```markdown
## Summary
- What changed and why (bullet per logical change)

## Bead
`cf-abc` (P1, task) — one-line description

## Reviewers (5-agent)
agent-1 (code-reviewer): APPROVE/REQUEST-CHANGES
agent-2 (silent-failure-hunter): APPROVE/REQUEST-CHANGES
agent-3 (code-simplifier): APPROVE/REQUEST-CHANGES
agent-4 (comment-analyzer): APPROVE/REQUEST-CHANGES
agent-5 (pr-test-analyzer): APPROVE/REQUEST-CHANGES

## Test plan
- [ ] `npm test` — N tests passing, 0 failing
- [ ] ESLint clean (`npm run lint`)
- [ ] TypeScript clean (`npm run typecheck`)
- [ ] Specific behavior X tested (describe)
- [ ] Error path Y tested (describe)

Generated with [Claude Code](https://claude.com/claude-code)
```

All `- [ ]` must be checked before merge.

---

## Security

- **Server Components vs Client Components**: Never put secrets or internal IDs in `"use client"` components — they serialize into the client bundle.
- **Server Actions**: Validate all inputs at the action boundary. Never trust client-supplied IDs.
- **Wix SDK tokens**: Never log or expose `WIX_CLIENT_SECRET`. All token handling in `src/lib/wix/`.
- **Sanitized HTML rendering**: Use `isomorphic-dompurify` for any user-controlled strings before rendering as HTML.
- **SSRF / open redirect**: All outbound URLs must match an allowlist. No `fetch(userInput)`.

---

## Coverage Thresholds (enforced by ratchet)

Thresholds are stored in `.github/workflows/coverage-ratchet.yml` and auto-bumped when coverage improves. Never manually lower them.

---

## CI Checks

All must be green before merge:

- `lint-typecheck-test` — ESLint + tsc --noEmit + vitest run
- `e2e` — Playwright (may show as cancelled on Stilgar-initiated runs; lint+Vercel green is sufficient)
- `Vercel` — Preview deploy must succeed

---

## Questions?

- Beads: `cd ~/gt/cfutons && bd list`
- Open PRs: `gh pr list --repo DreadPirateRobertz/carolina-futons-web --state open`
- Reach melania (PM): `gt nudge cfutons/crew/melania 'message'`

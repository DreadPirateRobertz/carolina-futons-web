## Summary

<!-- 2-3 bullets: what does this PR do at a high level? -->
-
-

## Bead

Closes `cf-XXXX` <!-- or: Related to cf-XXXX -->

## Type of Change

- [ ] New feature
- [ ] Bug fix
- [ ] Refactor / cleanup
- [ ] Infrastructure / config
- [ ] Documentation
- [ ] Test coverage

## Current vs New Behavior

**Before:** <!-- What happened before? What was broken, missing, or different? -->

**After:** <!-- What happens now? Be specific — routes, UI states, error messages, server-action signatures. -->

## Detail

<!-- Go deep. For commerce features: data flow Wix Headless ↔ Server Action ↔ Client.
     For bugs: root cause, why it happened, why this fix is correct.
     For refactors: what changed structurally, what stayed the same. -->

## How to Test

<!-- Step-by-step a reviewer can follow to verify this works -->
1.
2.

## Checklist

**Code quality**
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes (includes new tests)
- [ ] `npx playwright test` passes locally (or CI)
- [ ] Codecov patch coverage >= 85% on new code
- [ ] No `console.log` or `debugger` left behind

**TDD**
- [ ] Tests written alongside or before implementation
- [ ] Happy-path test included
- [ ] Error / edge-case test included
- [ ] No new feature code without tests
- [ ] Key-contract tests (array exports, constant lists) include `toHaveLength(N)` to catch silent additions/removals
- [ ] Server-only modules stay behind `import "server-only"` and are not imported from client code

**Security**
- [ ] No secrets, API keys, or `.env` files committed
- [ ] New env vars documented in `.env.example`
- [ ] External input (webhooks, form posts, query params) validated at route boundary
- [ ] Wix webhook routes verify HMAC signature before acting

**Compatibility**
- [ ] No breaking changes to existing API / Server Action contracts (or documented below)
- [ ] Vercel preview deploy is healthy

## Breaking Changes

<!-- List breaking changes to routes, Server Actions, env vars. "None" if not applicable. -->
None

## Self-Review

- [ ] I have read my own diff and confirmed it matches the intent above

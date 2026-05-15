# TDD Standards — Carolina Futons Web

Test-Driven Development is mandatory on this project. No implementation without a failing test first.

---

## 1. The TDD Cycle

```
1. Write a failing test
2. Run it — verify FAIL (if it passes immediately, the test is wrong)
3. Write minimal implementation to make it pass
4. Run tests — verify PASS
5. Refactor
6. Commit
```

Never skip step 2. A test that was never red is not a test.

---

## 2. What to Test

**All of these are required — not optional:**

### Happy path
The normal success case with valid input and all dependencies healthy.

### Empty / null inputs
```ts
// Always test: null, undefined, [], {}, ""
it("returns [] when product list is empty", () => { ... });
it("returns null when slug not found", () => { ... });
```

### Boundary values
Test at, just below, and just above thresholds.
```ts
// For COMPARE_MAX=4: test 3 items (below), 4 items (at max), and adding a 5th (over)
```

### Error propagation
What does the component/function do when a dependency throws?
```ts
it("shows error state when fetch rejects", async () => { ... });
it("logs error and returns [] when localStorage throws", () => { ... });
```

### Graceful degradation
When one operation fails, others must continue. Test `Promise.allSettled` semantics.
```ts
it("sends remaining emails even when one recipient fails", async () => { ... });
```

### Auth edge cases (where applicable)
- Unauthenticated access to member-gated routes
- Expired session / token refresh
- CSRF token mismatch

### Race conditions (where applicable)
Concurrent calls, stale closure state, debounce/throttle boundaries.

**Happy-path-only test suites are rejected at review.** If your describe block has exactly one `it()`, you are not done.

---

## 3. Test File Conventions

**Location:** `src/__tests__/` — this is what CI runs. Match the source file name:
- `src/components/cart/CartDrawer.tsx` → `src/__tests__/CartDrawer.test.tsx`
- `src/lib/product/compare-state.ts` → `src/__tests__/compare-state.test.ts`

**Naming:** `describe` block = component/module name. `it()` = behaviour from the user's perspective.

```ts
describe("CompareBar", () => {
  it("renders nothing when compare list is empty", () => { ... });
  it("shows item count with max label at COMPARE_MAX items", () => { ... });
  it("clears localStorage and hides bar when Clear is clicked", () => { ... });
  it("reacts to cf-compare-change events from other components", () => { ... });
});
```

**Setup:** Use `beforeEach` to reset shared state. Use `afterEach` with `cleanup()` for React renders. Never let test state leak between cases.

**Mocking:**
- Mock at the boundary (Wix SDK, localStorage, window events) — not inside the unit.
- Prefer real event dispatch over mocked `addEventListener` — tests the actual subscription contract.
- `vi.mock("next/navigation", ...)` is standard for App Router components.

---

## 4. Comment Conventions

Comments explain **WHY**, not **WHAT**. The code explains what. Comments explain the reasoning.

```ts
// BAD — states the obvious
// Loop through slugs and build URL
const url = slugs.join(",");

// GOOD — explains a non-obvious constraint
// getCompareSlugs() returns [] on SSR (no window); call only inside useEffect
// to prevent hydration mismatch on pages with a populated compare list.
const sync = () => setSlugs(getCompareSlugs());
```

**When to add a comment:**
- A hidden constraint or platform limitation (Wix, Next.js, Lenis, etc.)
- A deliberate workaround for a specific bug (reference the bead/PR)
- Why a simpler approach was rejected
- Hysteresis values, timing thresholds, magic numbers
- Invariants that must hold for correctness

**Do not comment:**
- Variable declarations (`const count = slugs.length; // the count`)
- Obvious control flow
- What a function does (that's JSDoc's job)

---

## 5. Logging Standards

Log errors and meaningful state transitions. Do not log routine operations.

```ts
// BAD — noise in production logs
console.log("Fetching product:", slug);
console.log("Product fetched");

// GOOD — signal
console.error("[getProductBySlug] Wix SDK error for slug:", slug, err);
console.warn("[CartDrawer] Checkout redirect failed — order may not complete:", err);
```

**Format:** `[module-or-component] message — relevant context`

**Always log:**
- Errors with full context (`console.error`)
- Final aggregate result of batch operations
- Unexpected null/undefined when a value was required

**Never log:**
- Individual items in a loop (log the aggregate count instead)
- Successful reads
- Auth checks passing

---

## 6. Coverage Requirements

Thresholds are enforced by the coverage ratchet in CI and auto-bump when coverage improves. Current floor is stored in `.github/workflows/coverage-ratchet.yml`. Never manually lower it.

Check locally before pushing:

```bash
npm run test:coverage
# Look for uncovered lines in the summary — add tests before opening a PR
```

---

## 7. Running Tests

```bash
npm test                                          # full suite
npm run test:watch                                # watch mode
npx vitest run src/__tests__/MyComponent.test.tsx # single file
npm run test:e2e                                  # Playwright
npm run typecheck                                 # tsc --noEmit
npm run lint                                      # ESLint
```

---

## References

- [CONTRIBUTING.md](../CONTRIBUTING.md) — full contribution workflow
- [docs/TESTING-GUIDE.md](./TESTING-GUIDE.md) — test inventory by surface area
- [DreadPirateRobertz/gastown/CONTRIBUTING.md](https://github.com/DreadPirateRobertz/gastown/blob/main/CONTRIBUTING.md) — canonical Gas Town process

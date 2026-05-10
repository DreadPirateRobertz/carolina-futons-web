# cfw — Dark Mode Wave 2 Audit (account / contact / getting-it-home / checkout cluster)

> **Bead**: cf-rn4j · **Date**: 2026-05-10 · **Auditor**: miquella · **Method**: static analysis (Puppeteer screenshot run blocked by cf-ukc6 Vercel-credit conservation; uses the cf-ax24 root-cause heuristic — `bg-white` / `bg-cf-navy` / `bg-cf-espresso` / `bg-cf-cream` / `text-cf-navy` / `text-cf-espresso` / `text-cf-ink` / `text-cf-charcoal*` without companion `dark:` overrides).

---

## Coverage scope

Per the bead, every page NOT walked in cf-ax24 wave 1. Files inspected:

| Page | File(s) | Status under static heuristic |
|---|---|---|
| /account | `account/page.tsx` + `components/account/AccountSignIn.tsx` | ⚠️ findings |
| /account/forgot-password | `account/forgot-password/page.tsx` | ✅ clean |
| /contact | `contact/page.tsx` (+ `contact-state.ts`, `actions.ts`) | ⚠️ findings |
| /getting-it-home | `getting-it-home/page.tsx` + `AddressCheckForm.tsx` | 🟥 multi-finding |
| /design-a-room | `design-a-room/page.tsx` | ⚠️ findings |
| /spring-sale | `spring-sale/page.tsx` | ⚠️ findings |
| /gift-cards | `gift-cards/page.tsx` + `loading.tsx` | 🟥 multi-finding |
| /guides + /guides/[slug] | `guides/page.tsx` + `[slug]/page.tsx` | ⚠️ findings |
| /reviews | `reviews/page.tsx` + `ReviewFilter.tsx` | ⚠️ findings |
| /compare | `compare/page.tsx` | ⚠️ findings |
| /order-confirmation | `order-confirmation/page.tsx` | 🟥 multi-finding |
| QuickViewModal | `components/product/QuickViewModal.tsx` | ⚠️ findings |

**No checkout-route files audited** — `/checkout/*` is a Wix Headless redirect, not a cfw-rendered route. Out of scope.

Severity legend per cf-ax24 convention:
- 🟥 P1 — page renders forced-light against a `dark` body class, breaking the contract
- ⚠️ P2 — single-component or single-color regression; readable in dark mode but inconsistent
- ✅ — no findings

---

## Findings

### 🟥 /getting-it-home — `AddressCheckForm.tsx`

| Line | Issue | Recommended fix |
|---|---|---|
| 28, 48 | `text-cf-espresso` form label | add `dark:text-cf-cream` |
| 42, 59 | `bg-white` zip + address inputs | add `dark:bg-cf-cream dark:text-cf-espresso dark:border-cf-sand` |
| 83 | `bg-cf-error/10 ... text-cf-espresso` error pane | add `dark:bg-cf-error/20 dark:text-cf-cream` |
| 93 | `bg-cf-cream ... text-cf-espresso` info pane | add `dark:bg-cf-sand dark:text-cf-cream` |
| 111 | `bg-cf-cream ... text-cf-espresso` zone-display pane | same as :93 |
| 116 | `text-cf-espresso/80` zone description | add `dark:text-cf-cream/80` |

Also `getting-it-home/page.tsx`:

| Line | Issue | Fix |
|---|---|---|
| 20 | `text-cf-ink` article wrapper | add `dark:text-cf-cream` |
| 69 | `text-cf-espresso` zone name | add `dark:text-cf-cream` |

### 🟥 /gift-cards — `page.tsx` + `loading.tsx`

| File:line | Issue | Fix |
|---|---|---|
| `page.tsx:27` | `bg-cf-espresso text-white` numbered step circle | add `dark:bg-cf-cream dark:text-cf-espresso` |
| `page.tsx:31` | `text-cf-espresso` h1 | add `dark:text-cf-cream` |
| `page.tsx:34, 47` | `text-cf-charcoal/70` body | add `dark:text-cf-cream/70` |
| `page.tsx:43` | `border-cf-smoke bg-cf-sand/30` info pane | add `dark:border-cf-cream/20 dark:bg-cf-sand/60` (per cf-ax24 dark surface table) |
| `page.tsx:44` | `text-cf-espresso` h2 | add `dark:text-cf-cream` |
| `loading.tsx:39` | `border-cf-smoke bg-cf-sand/30` skeleton | same fix as :43 |

### 🟥 /order-confirmation — `page.tsx` (12 forced-light text classes)

| Lines | Issue | Fix |
|---|---|---|
| 108, 121, 124, 151, 178, 181, 220, 231, 264, 286, 287, 316 | repeated `text-cf-ink` (and `border-cf-ink/15`, `border-cf-ink/20`, `border-cf-ink/10`) | sweep-replace with `text-cf-ink dark:text-cf-cream` and `border-cf-ink/15 dark:border-cf-cream/15` etc. |

This is a single-page sweep — ~12 class additions in one file. Recommend an all-in-one tweak.

### ⚠️ /account — `components/account/AccountSignIn.tsx`

| Line | Issue | Fix |
|---|---|---|
| 71, 93 | `text-cf-navy` h1 | add `dark:text-cf-cream` |
| 74, 96 | `text-cf-charcoal/80` lede | add `dark:text-cf-cream/80` |
| 104, 123 | `text-cf-charcoal` form labels | add `dark:text-cf-cream` |
| 162, 168 | `text-cf-charcoal/60` fine-print legal | add `dark:text-cf-cream/60` |

`AccountSignIn` is a client component; ensure inputs themselves carry `dark:bg-cf-cream dark:text-cf-espresso` (verify with a screenshot when credit window opens).

### ⚠️ /contact

| File:line | Issue | Fix |
|---|---|---|
| `contact/page.tsx:20` | `text-cf-ink` article wrapper | add `dark:text-cf-cream` |

### ⚠️ /design-a-room

| File:line | Issue | Fix |
|---|---|---|
| `design-a-room/page.tsx:25` | `text-cf-ink` article wrapper | add `dark:text-cf-cream` |

### ⚠️ /spring-sale

| File:line | Issue | Fix |
|---|---|---|
| `page.tsx:58, 89` | `text-cf-navy` headlines | add `dark:text-cf-cream` |
| `page.tsx:62, 93` | `text-cf-charcoal/80` lede paragraphs | add `dark:text-cf-cream/80` |

### ⚠️ /guides + /guides/[slug]

| File:line | Issue | Fix |
|---|---|---|
| `guides/page.tsx:23` | `text-cf-ink` index wrapper | add `dark:text-cf-cream` |
| `guides/[slug]/page.tsx:49` | `text-cf-ink` article wrapper | same |

### ⚠️ /reviews

| File:line | Issue | Fix |
|---|---|---|
| `reviews/page.tsx:31` | `text-cf-ink` page wrapper | add `dark:text-cf-cream` |
| `reviews/ReviewFilter.tsx:74` | `text-cf-ink/20` empty-star | add `dark:text-cf-cream/20` |
| `reviews/ReviewFilter.tsx:85` | `text-cf-ink` review body | add `dark:text-cf-cream` |

### ⚠️ /compare

| File:line | Issue | Fix |
|---|---|---|
| `compare/page.tsx:64, 94` | `text-cf-ink` h1's (empty + populated states) | add `dark:text-cf-cream` |

### ⚠️ QuickViewModal

| Line | Issue | Fix |
|---|---|---|
| 103 | `text-cf-muted hover:text-cf-ink` close button | add `dark:text-cf-cream/60 dark:hover:text-cf-cream` |
| 126 | `text-cf-ink` h2 | add `dark:text-cf-cream` |
| 154 | `text-cf-ink/80` description | add `dark:text-cf-cream/80` |

### ✅ /account/forgot-password

Static scan returned zero forced-light classes. (Page may rely on a wrapping client component that inherits dark mode safely; verify by hover-state / form-state walkthrough when the screenshot window opens.)

---

## Single batched cfw push

Per cf-ukc6, **all the above tweaks land in one PR**. The change set is mostly mechanical class-list additions; estimated diff size ~80 line edits across 11 files. No new components, no new tokens — pure `dark:` companion classes following the cf-ax24 token table.

Recommended PR sequence inside that single push:

1. `getting-it-home/AddressCheckForm.tsx` + `getting-it-home/page.tsx` (8 sites)
2. `gift-cards/page.tsx` + `gift-cards/loading.tsx` (6 sites)
3. `order-confirmation/page.tsx` (12 sites)
4. `account/AccountSignIn.tsx` (8 sites)
5. `contact/page.tsx`, `design-a-room/page.tsx`, `compare/page.tsx`, `guides/page.tsx`, `guides/[slug]/page.tsx` (1 site each)
6. `spring-sale/page.tsx` (4 sites)
7. `reviews/page.tsx` + `reviews/ReviewFilter.tsx` (3 sites)
8. `components/product/QuickViewModal.tsx` (3 sites)

Total: **~46 sites across 11 files**.

## What this audit could NOT verify

- **Live screenshot diff** with `dark` class injected via Puppeteer — the cf-ax24 wave 1 methodology. Deferred per cf-ukc6.
- **Computed-style verification** (`getComputedStyle` reads of background/color tokens after class composition) — same gate.
- **Component states** (hover, focus, disabled, loading) — static class scan only catches the rendered-once paths. Hover/focus contrast can mask a forced-light variant.
- **Account dashboard sub-routes** (`/account/orders`, `/account/profile`, etc. if mounted under `(member)/` group) — separate audit if they exist; the static scan didn't surface them under `/account/*` directly.
- **Spring-sale page liveness** — page exists; if the campaign is retired, the dark mode work could be deferred or the page deleted. Worth a Stilgar product check before the fix PR.

## Recommended sub-beads

| Title | Scope |
|---|---|
| `cf-?? cf-rn4j.fix1: getting-it-home dark-mode pass` | 8 sites in 2 files |
| `cf-?? cf-rn4j.fix2: gift-cards + order-confirmation + QuickViewModal dark-mode pass` | 21 sites in 4 files (the heavy lift) |
| `cf-?? cf-rn4j.fix3: misc page wrappers dark-mode pass` | account / contact / design-a-room / compare / guides / reviews / spring-sale (~17 sites in 8 files) |

Or: bundle all three into one mechanical PR per cf-ukc6 single-push discipline. Three smaller bundles only make sense if Stilgar wants them reviewed independently.

## Refs
- Bead: cf-rn4j (wave 2)
- Wave 1 audit: cf-ax24 (referenced for token table)
- Standing order: cf-ukc6 (drives static-only methodology)
- Sibling cfw audit: `docs/qa/a11y-audit-2026-05-10.md` (cf-7tkf)
- Files reviewed: 18 (full list in §Coverage scope)

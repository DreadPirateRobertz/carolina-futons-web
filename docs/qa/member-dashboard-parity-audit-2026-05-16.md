# cfw — Tool Pages Parity Audit Wave 3 (`/dashboard/*` vs Wix `/account/*`)

> **Bead**: cf-ruhm-w3 (proposed) · **Parent**: cf-3qt.6 Tool pages parity · **Date**: 2026-05-16 · **Auditor**: quartz · **Method**: static analysis of cfw Next.js source + `curl` of `carolinafutons.com` (Wix Studio prod) `/account/*` paths. Sister audits: cf-ruhm (`/compare` + `/search`, PR #590 MERGED b9b3597) and cf-ruhm-w2 (`/wishlist` + `/registry`, PR #649).

---

## Executive summary

Wave 3 audits the member-dashboard tab strip. cfw nests under
`/dashboard/*`; Wix prod nests under `/account/*` with `my-` prefixed
sub-routes. The parity story is **good on features, bad on URL space**
— old bookmarks + emails 404 on cfw without per-tab ingress redirects.

| cfw tab | cfw URL | Wix prod URL | Parity status |
|---|---|---|---|
| Overview | `/dashboard` | `/account` (200) | URL diverges; feature parity |
| Orders | `/dashboard/orders` | `/account/my-orders` (200) | URL diverges; feature parity |
| Wishlist | `/dashboard/wishlist` | `/account/my-wishlist` (200) | Ingress redirect **shipped** in cf-09r (PR #659) |
| Addresses | `/dashboard/addresses` | `/account/my-addresses` (200) | URL diverges; feature parity (cf-dmos / cf-zn5b.2) |
| Profile | `/dashboard/profile` | `/account/profile` (200) + `/account/my-account` (200) | URL diverges; cfw collapses to a single page |
| Preferences | `/dashboard/preferences` | `/account/notifications` (200) | URL diverges + label diff |
| **(missing)** | — | `/account/my-subscriptions` (200) | **cfw gap** — no subscriptions tab |

| Severity | Count | Action |
|---|---:|---|
| 🟥 P0 | 0 | none |
| 🟧 P1 | 2 | `/account/*` ingress redirects (5 paths) + subscriptions feature gap |
| 🟨 P2 | 2 | "Preferences" → "Notifications" label alignment; /account/my-account dual-URL handling |
| ⬜ P3 | 1 | top-level `/account` → `/dashboard` redirect |

The two P1 findings are clean: one is a `next.config.ts` batch
(mirrors cf-09r's pattern); the other is a feature discovery
(subscriptions) that needs product alignment before code.

---

## §1 — `/dashboard` tab strip (cfw)

### What cfw ships

**Tab definition** (`src/components/member/DashboardShell.tsx:17–25`):

```ts
export const DASHBOARD_TABS: readonly DashboardTab[] = [
  { key: "overview",    href: "/dashboard",             label: "Overview"    },
  { key: "orders",      href: "/dashboard/orders",      label: "Orders"      },
  { key: "wishlist",    href: "/dashboard/wishlist",    label: "Wishlist"    },
  { key: "addresses",   href: "/dashboard/addresses",   label: "Addresses"   }, // cf-dmos
  { key: "profile",     href: "/dashboard/profile",     label: "Profile"     },
  { key: "preferences", href: "/dashboard/preferences", label: "Preferences" },
] as const;
```

**Routes** (`src/app/(member)/dashboard/`):
- `page.tsx` — overview (member name/email + recent activity)
- `orders/page.tsx` — order list
- `wishlist/page.tsx` — read-only wishlist (full version at `/wishlist`)
- `addresses/page.tsx` — saved address book (cf-dmos)
- `profile/page.tsx` — name / email / password
- `preferences/page.tsx` — notification preferences
- `[...slug]/page.tsx` — catch-all (404 + redirect to overview)

**Auth-gate**: `getMemberSession()` at the layout level; unauthenticated visitors are OAuth-round-tripped.

### What Wix Studio prod ships

| Wix URL | HTTP |
|---|---:|
| `/account` | 200 |
| `/account/my-orders` | 200 |
| `/account/my-wishlist` | 200 |
| `/account/my-addresses` | 200 |
| `/account/profile` | 200 |
| `/account/my-account` | 200 |
| `/account/notifications` | 200 |
| `/account/my-subscriptions` | 200 |

Wix prod uses `my-` prefixed sub-routes for collection surfaces and bare names for settings.

### Findings

#### 🟧 P1.1 — `/account/*` ingress redirects (5 paths beyond cf-09r)

**The gap**: cf-09r (PR #659) shipped `/account/my-wishlist → /wishlist`.
Five sibling Wix URLs still 404 on cfw:

| Wix prod URL | should redirect to |
|---|---|
| `/account` | `/dashboard` |
| `/account/my-orders` | `/dashboard/orders` |
| `/account/my-addresses` | `/dashboard/addresses` |
| `/account/profile` | `/dashboard/profile` |
| `/account/notifications` | `/dashboard/preferences` |

Each is a one-row `next.config.ts redirects()` entry. **All five land
in one PR per cf-ukc6 batched-push discipline.**

The `/account/my-subscriptions` case is **different** — it's a feature
gap, not a URL gap (see P1.2 below).

The `/account/my-account` case is **also different** — Wix surfaces
profile data at two URLs (`/account/profile` AND `/account/my-account`).
cfw collapses to one; pick the canonical and 308 the other (see §P2 below).

**Files**: `next.config.ts` (5 redirect rows) + 5 tests in `redirects.test.ts`.

**Why P1 not P2**: ingress traffic from Wix-era marketing emails + bookmarks
is real (Stilgar's prior shop has been on Wix since 1991-era — many
indexable + emailed links). 404s vs redirects is a customer-task block,
not a polish item.

#### 🟧 P1.2 — Subscriptions feature gap

**Wix prod** ships `/account/my-subscriptions` (200) — likely
Wix Stores' subscription product surface (e.g., a recurring mattress-
cleaning service or a periodic-delivery SKU). **cfw has no
subscriptions tab or page.**

Verification needed before fix: does Wix prod actually offer
subscription SKUs to shoppers, or is the route a Wix-default that
shows an empty state for stores with no subscription products? A
1-minute manual check by the overseer settles it.

If subscriptions ARE offered:
- Need a `/dashboard/subscriptions` route + tab strip entry
- Wire to `@wix/auto_sdk_ecom_subscriptions` (if available; verify SDK
  package coverage)
- Mirror the orders tab pattern

If subscriptions are NOT offered (empty Wix default):
- Close as no-feature, file a follow-up if/when subscriptions launch
- Still ship a `/account/my-subscriptions → /dashboard` redirect so
  ingress doesn't 404

**Files**: TBD — depends on the product decision.

### `/dashboard` parity wins (no action)

- ✅ Tab strip (6 tabs) closely mirrors Wix's account-side surfaces.
- ✅ cf-dmos addresses tab (PR landed earlier in this session window —
  cf-zn5b.2 G-9 cutover P1) closed a previous gap.
- ✅ Auth-gate via `getMemberSession()` mirrors Wix's member-only
  protection.
- ✅ Catch-all `[...slug]/page.tsx` graceful 404 for unknown sub-routes.

---

## §2 — URL space + label divergence

### 🟨 P2.1 — `/account/my-account` dual-URL on Wix

Wix surfaces profile data at **both** `/account/profile` (200) and
`/account/my-account` (200). They may render the same page or be
slightly different (profile = display name + photo; my-account = email +
password). cfw collapses these into a single `/dashboard/profile`.

**Recommendation**: both Wix URLs should redirect to `/dashboard/profile`
in the P1.1 batch. The dual-URL handling is the unique part — pick the
canonical (Wix's `/account/profile` is the more specific URL) and 308
the other. Bundles with cf-ruhm-w3.1.

### 🟨 P2.2 — "Preferences" (cfw) vs "Notifications" (Wix)

cfw uses **"Preferences"** as the label for `/dashboard/preferences`;
Wix uses **"Notifications"** for `/account/notifications`. They cover
the same surface (notification opt-ins, communication frequency, etc.).

**Recommendation**: align to "Notifications" — it's the more shopper-
familiar term + matches the cf-coc / cfw-aor work surfacing GA4 +
Sentry breadcrumbs around notification events. "Preferences" is too
generic.

Tiny change: 1 label string in `DASHBOARD_TABS` + the page H1 + nav
links. ~3 lines. File as cf-ruhm-w3.4.

---

## §3 — Top-level `/account` route

### ⬜ P3.1 — `/account` → `/dashboard` top-level redirect

Wix's bare `/account` (200) lands at the account hub. cfw's bare
`/dashboard` is the dashboard hub. For Wix-era bookmarks to `/account`
alone (without a sub-tab), add the 308.

**Note**: the existing `/members-area → /account`, `/members → /account`,
`/paywall → /account`, `/plans-pricing → /account` redirects (cf-3qt.7.1)
land Wix-era member surfaces at `/account`. **Those are now wrong** —
`/account` doesn't exist on cfw. The existing redirects need their
destination changed to `/dashboard` too.

**Files**: `next.config.ts` (modify 4 existing destinations + add
`/account` source). Bundles with P1.1.

---

## §4 — What this audit could NOT verify

Per cf-ukc6, static-only methodology. Deferred runtime checks:

1. **Wix prod actual rendered content** — `/account/my-account` vs
   `/account/profile` could be the same page or two pages. A 1-minute
   browser walkthrough by the overseer settles the §P2.1 dual-URL
   question.
2. **Subscriptions SKU existence** — `/account/my-subscriptions` 200
   doesn't tell us whether Wix has subscription products today. Read
   `@wix/ecom` subscriptions API or check Wix admin manually.
3. **`/account/*` ingress traffic** — Vercel logs would tell us
   whether the 5 redirects (P1.1) close a high-volume or low-volume
   gap. Both are still worth shipping; volume just confirms priority.

Recommend folding these verification items into the existing
**cfw-chs / cfw-mny** runtime-pass beads gated on cf-ukc6 lift.

---

## §5 — Recommended sub-beads

| Sub-bead | Pri | Title | Scope |
|---|---|---|---|
| cf-ruhm-w3.1 | P1 | Five `/account/*` → `/dashboard/*` permanent redirects + `/account/my-account` collapse | 6 rows in `next.config.ts` + 6 tests. Mirrors cf-09r pattern. ~30 min impl. Bundles with the existing cf-3qt.7.1 `/members-area→/account` destination flips (now wrong). |
| cf-ruhm-w3.2 | P1 | Subscriptions feature gap — verify + decide | Overseer task: confirm whether Wix has subscription SKUs. If yes, file cf-ruhm-w3.2.1 for `/dashboard/subscriptions` impl. If no, ship `/account/my-subscriptions → /dashboard` redirect. |
| cf-ruhm-w3.3 | P2 | `/account/my-account` → `/dashboard/profile` (dual-URL collapse) | Bundles with cf-ruhm-w3.1; called out separately so the dual-URL semantics aren't lost. |
| cf-ruhm-w3.4 | P2 | "Preferences" → "Notifications" label alignment | 1 label in `DASHBOARD_TABS` + page H1 + breadcrumb crumb. ~3 line diff. |
| cf-ruhm-w3.5 | P3 | Top-level `/account` → `/dashboard` redirect + cf-3qt.7.1 destination flips | Bundles with cf-ruhm-w3.1; flagged separately for the cf-3qt.7.1 stale-destination concern (members-area / members / paywall / plans-pricing all currently land at `/account` which 404s). |

cf-ruhm-w3.1 + cf-ruhm-w3.3 + cf-ruhm-w3.5 all touch `next.config.ts`
and can land as one PR (matches cf-ukc6 batched-push discipline).
cf-ruhm-w3.4 is independent (DashboardShell change). cf-ruhm-w3.2 is
overseer-gated.

---

## §6 — TDD + doc compliance notes

Per Stilgar's 2026-05-15 TDD/Doc standing order:

- **Existing redirect test coverage** is strong (`src/__tests__/redirects.test.ts`
  has 9 tests post-cf-09r). Each new redirect should add one assertion
  block following the established pattern.
- **DashboardShell** has tests at `src/__tests__/DashboardShell.test.tsx`.
  cf-ruhm-w3.4 (label flip) needs to update at least one test.
- **PR description format** should reference both cf-ruhm-w3 (this
  audit) and cf-09r (sibling redirect already shipped) for reviewer
  context.

---

## Refs

- Bead: cf-ruhm-w3 (proposed; sub-beads cf-ruhm-w3.1–.5 cascade from this audit)
- Parent: cf-3qt.6 Tool pages parity
- Sibling audits:
  - `docs/qa/tool-pages-parity-audit-2026-05-15.md` (cf-ruhm, MERGED b9b3597 — `/compare` + `/search`)
  - `docs/qa/wishlist-registry-parity-audit-2026-05-16.md` (cf-ruhm-w2, PR #649 — `/wishlist` + `/registry`)
- Sibling redirect: cf-09r (PR #659, `/account/my-wishlist → /wishlist`)
- Standing orders: cf-ukc6 (Vercel-credit conservation — drove static-only methodology), 2026-05-15 5-agent review + TDD/Doc standards
- Files reviewed: `src/app/(member)/dashboard/page.tsx`, `src/app/(member)/dashboard/orders/page.tsx`, `src/app/(member)/dashboard/addresses/page.tsx`, `src/app/(member)/dashboard/profile/page.tsx`, `src/app/(member)/dashboard/preferences/page.tsx`, `src/app/(member)/dashboard/wishlist/page.tsx`, `src/app/(member)/dashboard/[...slug]/page.tsx`, `src/components/member/DashboardShell.tsx`, `next.config.ts` (redirect surface)
- Wix prod URLs fetched: `/account` (200), `/account/my-orders` (200), `/account/my-wishlist` (200), `/account/my-addresses` (200), `/account/profile` (200), `/account/my-account` (200), `/account/notifications` (200), `/account/my-subscriptions` (200)

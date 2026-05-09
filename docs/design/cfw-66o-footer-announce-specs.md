# cfw-66o sub-bead specs — Footer (cf-n7ni) + AnnouncementBar (cf-68w4)

**Author:** blaidd (cfutons/crew)
**Date:** 2026-05-09
**Audience:** the polecats picking up cf-n7ni (Footer SiteContent refactor) and cf-68w4 (AnnouncementBar SiteContent refactor).
**Sibling:** cfw-66o.6 (cf-atze) provisions the SiteContent collection + seed rows. Both refactors are **safe to ship before** cf-atze lands — `getSiteContent(key, fallback)` already returns the fallback when Wix is unreachable, the collection isn't provisioned, or the key is missing (`src/lib/cms/site-content.ts`).
**Source-of-truth tokens:** `src/app/globals.css` (cf-cream / cf-cta / cf-divider / cf-charcoal / cf-footer-bg / cf-navy).

These are **refactor + visual polish** specs, not full redesigns. The visual delta against today's Footer / AnnouncementBar must be **zero by default**. Polish opportunities are flagged as optional and gated so the refactor PR can ship without them.

---

## Global rules — both surfaces

1. **Pixel parity.** A visual diff on Vercel preview against the merge base must show zero changes for both surfaces. Existing Footer + AnnouncementBar Vitest assertions stay green.
2. **`getSiteContent(key, fallback)` is the only API.** No reading `loadSiteContent` directly from a component. Always pass a fallback that matches today's hardcoded copy verbatim (so a missing/broken Wix row degrades to the current behavior).
3. **Naming convention** for SiteContent keys: dotted path, lowercase, hyphenated segments — `footer.tagline`, `announcement.rotation.0.message`. Mirrors the schema already documented in `src/lib/cms/site-content.ts`.
4. **No new Wix calls per render.** `loadSiteContent` is `react.cache`-memoized; do not bypass it.
5. **Tests:** keep the existing Footer + AnnouncementBar Vitest suites passing without modifying assertions. Add a new test per surface that covers the fallback path (Wix down → renders the fallback string) — see §3.6 and §4.6.

---

## 1. The two-pass strategy

Both refactors follow the same two-pass shape so the polecat can ship in two reviewable PRs (or one PR with two commits):

**Pass 1 — wrap the strings.** Replace each hardcoded literal with a `getSiteContent("<key>", "<current literal>")` call. **Hardcoded literal stays inside the call as the fallback.** No visual change today (Wix has no rows yet, so fallback wins). PR is byte-equivalent on the rendered DOM.

**Pass 2 — populate the rows.** cf-atze provisions the SiteContent collection + seed rows. Once those land, the live values replace the fallbacks automatically. No code change.

Order: Pass 1 first; you can ship before cf-atze ships. Pass 2 is owned by cf-atze, not the refactor bead.

---

## 2. Server / client boundary

`getSiteContent` is `"server-only"`. Both surfaces have to live on the server side of the boundary or get the strings prop-drilled in.

| Component | Today | After refactor |
| --- | --- | --- |
| `Footer.tsx` | `"use client"` (uses `useReducedMotion`) | Hoist content reads to a server `<Footer>` shell that fetches strings, then passes them as props to a client `<FooterMotion>` child that owns the float animation. |
| `AnnouncementBar.tsx` | server (no client hooks) | Stays server. Fetch + pass props down. |
| `AnnouncementBarCartAware.tsx` | `"use client"` (uses `useCart`) | Stays client. Receive **resolved rotation messages** as props from a server parent, do not call `getSiteContent` directly. |

Hoisting Footer to a server shell is the only structural change in either bead. Keep the client part minimal — just the bits that need framer-motion + `useReducedMotion`.

---

## 3. cf-n7ni — Footer SiteContent refactor

**Scope:** Footer tagline + copyright **only**. Phone, email, address are already canonicalized via `BUSINESS` constants in `src/lib/business/contact-info.ts` (cfw-3ty just landed there). Do **not** move those to SiteContent in this bead — the constants flow into JSON-LD + structured data + `<address>` tags in many components, and SiteContent reads are async / server-only. Out of scope.

### 3.1 Strings to wrap

| Key | Fallback (verbatim, post-cfw-3ty) | Where it lands |
| --- | --- | --- |
| `footer.tagline` | `Quality futon furniture since 1991` | `<p>` under the wordmark, line 130–132 of `Footer.tsx` |
| `footer.showroom-hours.label` | `Showroom hours: Sun–Tue, 10am–5pm` | Bottom of the Contact column, line ~192 |
| `footer.copyright.suffix` | `Carolina Futons. Hendersonville, NC.` | Year is computed; suffix is the editable part. Line 213. |

That's it. Three keys. **Do not** wrap the Shop / Info column labels — those are nav targets and editing them via SiteContent would let Brenda accidentally rename them out of alignment with route slugs. Nav stays in code.

### 3.2 Component shape after refactor

```tsx
// src/components/site/Footer.tsx — server shell
import { getSiteContent } from "@/lib/cms/site-content";
import { FooterMotion } from "@/components/site/FooterMotion";

export async function Footer() {
  const [tagline, hours, copyrightSuffix] = await Promise.all([
    getSiteContent("footer.tagline", "Quality futon furniture since 1991"),
    getSiteContent("footer.showroom-hours.label", "Showroom hours: Sun–Tue, 10am–5pm"),
    getSiteContent("footer.copyright.suffix", "Carolina Futons. Hendersonville, NC."),
  ]);

  return <FooterMotion tagline={tagline} hours={hours} copyrightSuffix={copyrightSuffix} />;
}
```

```tsx
// src/components/site/FooterMotion.tsx — client child (existing animation lives here)
"use client";
// ...all existing JSX, motion.div wrapping, useReducedMotion etc.
// Strings come in as props instead of being literals.
```

The split is purely organizational — the rendered DOM is byte-equivalent.

### 3.3 Year handling

Today the copyright reads `© {new Date().getFullYear()} Carolina Futons. Hendersonville, NC.` Keep the year computation in code (do **not** move it to SiteContent — Brenda doesn't need to edit "2026" every January). Splitting on the suffix means `<span>© {year} {suffix}</span>` where `suffix` comes from the CMS.

### 3.4 Test contract

Existing tests pass without changes:
- `src/__tests__/Footer.test.tsx` — `screen.getByText(/quality futon furniture since 1991/i)` passes against the fallback.
- `src/components/site/__tests__/Footer.integration.test.tsx` — copyright regex still matches.

Add a new test:

```ts
// Footer renders the live SiteContent value when the row exists.
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: vi.fn(async (key: string, fallback: string) => {
    if (key === "footer.tagline") return "Custom marketing line";
    return fallback;
  }),
}));
// expect(...getByText(/custom marketing line/i))...
```

Plus a regression case where `getSiteContent` rejects (Wix down) — verify the fallback wins.

### 3.5 Optional polish (gate behind a follow-up bead — do **not** ship in this PR)

If, while wiring SiteContent, you spot footer-side polish opportunities, file a follow-up rather than scope-creeping the refactor:

- **Inline edit pencil** when `?cf-edit=1` is on — adds a 12 × 12 pencil icon next to each editable string that opens the corresponding SiteContent row in Wix Studio. Useful for Brenda's onboarding session. Spec deferred.
- **Skeleton during fetch** — currently the Footer renders synchronously with the page; with the server-shell split, an absent SiteContent row still serves the fallback instantly, so no skeleton is needed. Don't add one.

### 3.6 Acceptance

- [ ] Pass 1 ships with three `getSiteContent(...)` calls; rendered DOM byte-equivalent to current `main`.
- [ ] No client-side `getSiteContent` import.
- [ ] Existing Footer Vitest suite green without assertion changes.
- [ ] One new test: live-row override branch.
- [ ] One new test: Wix-down fallback branch.
- [ ] Vercel preview visual diff against `main` shows zero footer changes.

---

## 4. cf-68w4 — AnnouncementBar SiteContent refactor

**Scope:** the static rotation messages and CTA pairs that scroll while the cart is empty. Cart-aware messages (`STATIC_PROMPT`, `QUALIFIED`, "Add $X for free delivery") **stay in code** — they depend on live cart subtotal and free-delivery threshold; not Brenda-editable copy.

### 4.1 Strings to wrap

The existing rotation has 5 messages and 5 (mostly empty) CTA slots. SiteContent rows mirror that shape so Brenda can edit each independently and the polecat can keep the rotation logic untouched.

| Key | Fallback | Notes |
| --- | --- | --- |
| `announcement.rotation.0.message` | `Free white-glove delivery on orders over $1,500` | Index 0 — the cart-empty default. Mirrors `STATIC_PROMPT` but the price string is hardcoded copy here; cart-aware code still owns the live recompute. |
| `announcement.rotation.1.message` | `10-year warranty on all hardwood futon frames` | |
| `announcement.rotation.2.message` | `Family-owned since 1991 · Hendersonville, NC` | |
| `announcement.rotation.3.message` | `Free fabric swatches — find your perfect match` | |
| `announcement.rotation.3.cta-label` | `Order free swatches` | Paired with index 3. |
| `announcement.rotation.3.cta-href` | `/swatch-request` | Paired with index 3. CTA hrefs SHOULD be Brenda-editable so she can swap to a seasonal landing page. |
| `announcement.rotation.4.message` | `Assembly included with every delivery` | |

Indices 0/1/2/4 have no CTA today; do **not** add `cta-label`/`cta-href` keys for those — keep the schema lean. If Brenda wants a CTA on index 1 later, file a bead.

### 4.2 Where the fetch happens

`AnnouncementBarCartAware.tsx` is `"use client"`. The fetch goes one level up, in the server component that renders the announcement bar (today that's `src/app/layout.tsx` or wherever the bar is mounted — confirm during impl). Resolve the strings server-side and pass the rotation array as a prop.

```tsx
// in the server parent
const rotation = await Promise.all(
  [0, 1, 2, 3, 4].map(async (i) => ({
    message: await getSiteContent(
      `announcement.rotation.${i}.message`,
      DEFAULT_ROTATION[i].message,
    ),
    cta:
      i === 3
        ? {
            label: await getSiteContent("announcement.rotation.3.cta-label", "Order free swatches"),
            href: await getSiteContent("announcement.rotation.3.cta-href", "/swatch-request"),
          }
        : undefined,
  })),
);
return <AnnouncementBarCartAware rotation={rotation} />;
```

`DEFAULT_ROTATION` is exported from `AnnouncementBarCartAware.tsx` (today's `ROTATION_MESSAGES` + `ROTATION_CTAS` zipped) so the server parent has the same fallback table the client uses.

### 4.3 Cart-aware branch — unchanged

`announcementMessage(subtotalCents)` and `STATIC_PROMPT` / `QUALIFIED` stay where they are. The "Add $X for free delivery" computation depends on live subtotal and the formatCents helper — moving it to SiteContent would force Brenda to maintain a templated string with formatting, which is the wrong tool. **Out of scope** for cf-68w4.

### 4.4 Rotation transitions — optional polish

The current rotation hard-cuts every 5 s. A 200 ms cross-fade between messages would soften it without introducing CLS:

```tsx
<motion.span
  key={messageIndex}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2, ease: "easeInOut" }}
>
  {currentMessage}
</motion.span>
```

- Wrap in `AnimatePresence mode="wait"` so the fade-out finishes before the new line appears (avoids two messages stacking).
- Reduced-motion: drop the motion entirely; key change does an instant swap.
- **Gate behind a separate commit** in the same PR so it can be reverted in isolation if Stilgar wants to keep hard cuts. If you'd rather not include it, file a follow-up bead — don't block cf-68w4 on it.

### 4.5 ARIA & a11y — keep as-is

Today's bar is `role="region" aria-label="Site announcement"` with `aria-live="polite" aria-atomic="true"` on the inner span. Keep both. The cross-fade polish above doesn't change announcement semantics — `aria-live="polite"` will re-announce when the message text changes regardless of whether the visual is hard-cut or fading.

Do **not** add a "pause rotation" control in this bead. It's reasonable polish but introduces a focus-management question (where does focus go after pause?) that needs a separate design pass.

### 4.6 Test contract

Existing tests pass without changes — `AnnouncementBarCartAware`'s `ROTATION_MESSAGES` re-export keeps the array shape stable. Add three new tests:

1. **Live override** — `getSiteContent("announcement.rotation.1.message", …)` returns `"Spring sale starts Friday"`; verify the bar cycles to that copy at index 1.
2. **CTA override** — `getSiteContent("announcement.rotation.3.cta-href", …)` returns `/spring-sale`; verify the link target updates.
3. **Wix down** — `loadSiteContent` returns `{ map: new Map(), error: "wix_sdk" }`; verify the rotation falls back to `DEFAULT_ROTATION` verbatim.

### 4.7 Acceptance

- [ ] All 7 SiteContent keys read with verbatim fallbacks.
- [ ] No client-side `getSiteContent` import.
- [ ] Cart-aware "free delivery" math untouched.
- [ ] Existing AnnouncementBar / AnnouncementBarCartAware Vitest suites green without assertion changes.
- [ ] Three new tests per §4.6.
- [ ] Vercel preview shows zero visual change against `main` (rotation cadence + style identical).

---

## 5. Migration sequencing & blast radius

| Step | Owner | Status |
| --- | --- | --- |
| Provision SiteContent Wix CMS collection + 20 seed rows | cf-atze | open |
| Brenda admin guide (Wix dashboard walkthrough) | cf-ubxu | shipped (PR #1155) |
| Footer.tsx tagline / hours / copyright via SiteContent | **cf-n7ni** | this spec |
| /visit address + hours via SiteContent | cf-h21g | in progress |
| AnnouncementBar rotation via SiteContent | **cf-68w4** | this spec |
| Webhook revalidate on Wix CMS edit | cf-nq7.1 / PR #7 | shipped |

cf-n7ni and cf-68w4 can ship in either order; both are independent of cf-atze (their fallbacks make them safe to ship before any rows exist). They are blocked only on each other's *visual* compatibility — if both land in the same deploy, run a Vercel-preview diff that covers home / a PDP / `/visit` to confirm no regressions.

## 6. Open questions

- **Edit-pencil affordance:** worth shipping in v1 or hold for Brenda's onboarding session feedback? Recommend hold — let Brenda use the Wix dashboard directly first and see if she asks for the inline path.
- **Edit-throttle / debounce:** Wix CMS edits revalidate the affected pages via the existing webhook (cf-nq7.1). If Brenda saves a row five times in a minute while iterating copy, we'd revalidate five times. Acceptable — cost is negligible — but worth noting.
- **Per-locale content:** all keys above assume single-locale (en-US). If/when multi-locale lands, prepend the locale to the key (e.g. `en-US.footer.tagline`). Not a concern today.
- **AnnouncementBar rotation length:** 5 messages today. Should Brenda be able to add a 6th via Wix without an engineer editing `ROTATION_INTERVAL_MS` or the rotation array length? File a follow-up if Stilgar wants dynamic-length rotations; the current spec keeps the array length pinned at 5 to avoid the "Brenda accidentally adds 50 messages" failure mode.

## 7. References

- SiteContent reader implementation: `src/lib/cms/site-content.ts` (cf-4mol / cfw-66o.2).
- Brenda admin guide (cfutons monorepo): `docs/brenda-admin-guide.md`.
- Prior text-edits PR (post-state for fallbacks): cfw-3ty / PR #475.
- /visit refactor (sibling reference): cf-h21g.
- Wix CMS revalidate webhook: cf-nq7.1.

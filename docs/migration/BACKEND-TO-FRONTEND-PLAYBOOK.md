# Backend-to-Frontend Playbook

A reference for Brenda and backend-side admins: how changes made in Wix or in Velo propagate to the Next.js storefront, and how to wire new frontend triggers from the backend side.

---

## Part 1 — CMS collection edits and how they surface

### Reviews

Reviews on the PDP and `/reviews` page come from **a static TypeScript array** — not from Wix CMS. To add a review:

1. Open `src/lib/discovery/reviews.ts`.
2. Add a new entry to the `REVIEWS` array:
   ```typescript
   {
     id: "r-XXX",           // unique, e.g. "r-042"
     author: "J. Smith",
     category: "frames",    // "frames" | "mattresses" | "murphy-beds"
     rating: 5,
     title: "Holds up after 3 kids",
     body: "We've had this frame for six years …",
     date: "2026-04-15",    // ISO 8601
     productName: "Classic Futon Frame",  // must match Wix product name exactly for PDP match
   },
   ```
3. Deploy (push a commit; Vercel auto-deploys `main`).

Reviews are **not cached** independently — they rebuild with the code. No revalidation step needed.

---

### Blog posts

Blog posts live entirely in the **Wix Dashboard → Blog → Posts**. No code change required.

- Add, edit, or publish a post in the Wix Dashboard.
- The storefront at `/blog` and `/blog/[slug]` caches for **5 minutes** (`revalidate = 300`).
- After publishing, the post appears within one cache window (≤5 min).
- The blog data fetching layer (`src/lib/wix/blog.ts`) does not currently use tagged `fetch` calls, so the `/api/revalidate` webhook cannot bust the blog cache early. The 5-minute window is the minimum publish lag.

---

### FAQ

FAQ items come from the **Wix CMS collection `"FAQ"`** (`src/lib/cms/faq.ts`, line 34).

1. In the Wix Dashboard, go to **CMS → FAQ collection → + New item**.
2. Fill in `question`, `answer`, and `category` fields.
3. Merge and deploy. The `/faq` page is statically generated — it reads the collection at build time and does not refresh until a new deploy.

---

### Press page

The press page (`/press`) is **static HTML** in `src/app/press/page.tsx`. There is no CMS collection behind it.

- To update story angles, press contact details, or the "last updated" date: edit the file and deploy.
- The page is cached for **24 hours** (`revalidate = 86400`). A new deploy busts this automatically.

---

### Products (Wix Stores)

Products are managed in the **Wix Dashboard → Stores → Products**.

| Action | Where it surfaces | When it appears |
|---|---|---|
| Add product | `/shop/[category]`, `/products/[slug]`, search | Immediately (PDP + PLP are `force-dynamic`) |
| Edit name / price / images | Same pages | Immediately |
| Toggle inventory | Stock badge on PDP/PLP | Immediately |
| Add to a collection | Collection page in `/shop/[category]` | Immediately |

Both the PDP (`/products/[slug]`) and PLP (`/shop/[category]`) are `force-dynamic` — they never serve a stale product. No revalidation hook is needed for product changes.

---

## Part 2 — Lightboxes and modals on the storefront

### Email capture popup

**File:** `src/components/site/EmailCapturePopup.tsx`

| Detail | Value |
|---|---|
| Trigger | 8 seconds after page load **OR** 50 % scroll depth, whichever comes first |
| Dismissed via | `localStorage["cf-email-popup-dismissed"] = "1"` |
| Re-enable (dev/QA) | Open DevTools → Application → Local Storage → delete the key |

The popup fires once per browser session (the localStorage key persists across page loads). Clearing the key makes it fire again on the next qualifying visit.

---

### Cart drawer

**File:** `src/components/cart/CartDrawer.tsx`

Triggered via `openCart()` from `useCart()` (see `src/components/cart/CartProvider.tsx`). The `addToCart` Server Action itself cannot call `openCart()` — Server Actions run on the server and cannot touch client-side React state. Instead, `AddToCartButton.tsx` (a client component) calls `openCart()` after the Server Action promise resolves. To open the cart drawer from a new place:

```typescript
import { useCart } from "@/components/cart/CartProvider";
// inside a "use client" component:
const { openCart } = useCart();
// …
<button onClick={openCart}>Open cart</button>
```

---

### PDP image lightbox

**File:** `src/components/product/PdpImageLightbox.tsx`

Receives `open: boolean` and `onClose: () => void` props. The parent (`PdpGallery`) owns the `useState<boolean>` and passes it down. To open the lightbox from a new trigger, lift the state to a shared parent and pass the props.

```typescript
const [lightboxOpen, setLightboxOpen] = useState(false);
// …
<PdpImageLightbox open={lightboxOpen} onClose={() => setLightboxOpen(false)} src={…} alt={…} />
```

---

### Compare page

The compare feature is a **full page** at `/compare?slugs=slug1,slug2`, not a drawer. There is no overlay to trigger — navigate to that URL with the desired slugs as a query parameter.

---

### Wiring a new modal/lightbox

Pattern used everywhere in the codebase:

1. In a `"use client"` parent component, add a state flag:
   ```typescript
   const [open, setOpen] = useState(false);
   ```
2. Mount the dialog component and pass the flag:
   ```tsx
   <MyDialog open={open} onClose={() => setOpen(false)} />
   ```
3. Add a trigger:
   ```tsx
   <button onClick={() => setOpen(true)}>Open</button>
   ```
4. If the dialog should open based on a URL param (e.g. `?openModal=newsletter`), read it with `useSearchParams()` inside the client component and drive the state from there.

---

## Part 3 — Triggering hidden-by-default UI from the backend

### Pattern 1 — React state (one-page)

The simplest case. The parent component holds a `useState` boolean; the child reads it via prop. Nothing persists across navigations. Best for: lightboxes, drawers, confirmation dialogs.

---

### Pattern 2 — localStorage flags

Used by the email popup and other persistent-dismiss UI. The flag is a **presence check** (any non-null value = dismissed). Note: `localStorage` persists across browser sessions (it is not cleared on tab close). A page reload is also required after clearing the key — an in-memory `useRef` guard prevents the popup from firing twice within the same React tree lifetime.

| Action | Code |
|---|---|
| Set (dismiss) | `localStorage.setItem("cf-email-popup-dismissed", "1")` |
| Check | `localStorage.getItem("cf-email-popup-dismissed") !== null` |
| Clear | `localStorage.removeItem("cf-email-popup-dismissed")` |

Use this pattern when UI should fire at most once per browser session (or be sticky between page navigations).

---

### Pattern 3 — URL search params

Any `"use client"` component can read URL params with `useSearchParams()`. Pages receive them as `searchParams` props on the server side.

Example: the search page uses `?q=…` to pre-fill the search query. A new `?openLightbox=newsletter` param would look like:

```typescript
// inside a "use client" component
import { useSearchParams } from "next/navigation";

const params = useSearchParams();
const [open, setOpen] = useState(params.get("openLightbox") === "newsletter");
```

URL params survive hard refreshes and can be shared as links.

---

### Pattern 4 — Server Action revalidation

When a Server Action mutates data it calls `revalidatePath()` or `revalidateTag()` from `next/cache` to bust the relevant cached pages. Example from the cart actions (`src/app/actions/cart.ts`):

```typescript
import { revalidatePath } from "next/cache";
// after mutation:
revalidatePath("/cart");
```

For tag-based revalidation (used by the Wix webhook at `/api/revalidate`):

```typescript
import { revalidateTag } from "next/cache";
revalidateTag("wix:collection:FAQ");  // busts all pages that read the FAQ collection
```

---

### Pattern 5 — Wix webhook → `/api/revalidate`

When Wix publishes or edits content it can POST a signed webhook to the storefront. The route at `src/app/api/revalidate/route.ts` verifies the `WIX_WEBHOOK_SECRET` HMAC signature and calls `revalidateTag()` for the affected collection/item.

The tag names follow a convention:

| Tag | What it busts |
|---|---|
| `wix:collection:{collectionId}` | All pages that list that collection |
| `wix:item:{itemId}` | The specific detail page for that item |

To wire a new collection to auto-revalidate:
1. Configure the Wix webhook to POST to `https://<domain>/api/revalidate` with the `collectionId` in the body and the HMAC signature in `x-wix-signature`.
2. In the data-fetching function, tag the `fetch` or `unstable_cache` call with `wix:collection:{id}`.

---

### Pattern 6 — Wix CMS field flag → conditional UI

If you want a backend-controlled on/off switch for a UI element (e.g. "show promo banner for this product"), add a boolean field to the relevant Wix CMS collection and read it in the Server Component that fetches the data. Example shape:

```typescript
// in the Server Component that fetches product data:
const product = await getProductBySlug(slug);
// product.showPromoBanner is a custom field from the Wix Stores product
// extra fields or a companion CMS collection
```

Then pass the field value as a prop to the Client Component responsible for the banner. No React state needed — the server makes the decision per request.

---

## Quick reference

| I want to… | Where to change it |
|---|---|
| Add a review | `src/lib/discovery/reviews.ts` → `REVIEWS` array → deploy |
| Add a blog post | Wix Dashboard → Blog → Posts |
| Add a FAQ entry | Wix Dashboard → CMS → FAQ collection |
| Edit press copy | `src/app/press/page.tsx` → deploy |
| Add/edit a product | Wix Dashboard → Stores → Products |
| Suppress the email popup (dev/QA) | Clear `localStorage["cf-email-popup-dismissed"]` to re-enable; set it to `"1"` to permanently suppress |
| Open cart drawer | Call `openCart()` from `useCart()` hook |
| Open image lightbox | Set `open={true}` on `<PdpImageLightbox>` |
| Add a new modal | `useState` in parent → pass `open`/`onClose` props |
| Persist UI flag across nav | `localStorage` key presence check |
| Trigger UI from URL | `useSearchParams()` in client component |
| Bust page cache from mutation | `revalidatePath()` or `revalidateTag()` in Server Action |
| Auto-bust on Wix content change | Configure Wix webhook → `/api/revalidate` |
| Toggle UI on/off from CMS | Add boolean field to Wix collection, read in Server Component, pass as prop |

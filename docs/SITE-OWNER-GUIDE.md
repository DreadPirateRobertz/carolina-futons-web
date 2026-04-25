# Carolina Futons — Site Owner Guide

A practical, plain-English reference for running the site without a developer in the loop. Tells you what you can change yourself in Wix, where it shows up on the site, and which things still require a dev change.

> The site is built in two pieces:
> 1. **Wix Dashboard** — your control panel. Products, prices, photos, blog posts, inventory.
> 2. **The storefront at carolina-futons-web** — the website customers see. Pulls product/blog data from Wix in near-real-time.
>
> When you add a product in Wix, it shows up on the storefront within a few minutes (caches refresh every 5 minutes). When you add a blog post, same thing. You don't deploy code or push anything — Wix is the source of truth.

---

## 1. Mental model — who owns what

| Thing | Where it lives | Who can change it |
|---|---|---|
| Products (name, price, photos, variants, stock, sale price) | Wix Dashboard → Store Products | **You** |
| Categories / collections | Wix Dashboard → Store Collections | **You** |
| Blog posts | Wix Dashboard → Blog → Posts | **You** |
| Product reviews | Static file in code (`src/lib/discovery/reviews.ts`) | Dev change |
| Page text (Shipping, Returns, About, etc.) | Code (`src/app/<page>/page.tsx`) | Dev change |
| Header/footer links | Code | Dev change |
| Sale lightbox / promo banners | **Combo** — see §4 | You + dev for first-time setup |

The storefront caches product data for **5 minutes** and blog posts for **5 minutes**. If you change something in Wix and don't see it immediately, wait 5 minutes and reload.

---

## 2. Adding a product

This is the most common thing you'll do. Full path:

1. Go to **wix.com** → log in → open the Carolina Futons site dashboard.
2. Left sidebar → **Store Products** → **+ New Product**.
3. Fill in:
   - **Name** — exactly as it should appear on the site (e.g. `Kingston Solid Oak Futon Frame`).
   - **Description** — supports rich text. Renders on the product detail page (PDP) under "About this product".
   - **Price** — the regular price.
   - **Sale price** — leave blank for non-sale items. When set, the storefront automatically shows the strike-through original + sale price + an "On sale" badge.
   - **SKU** — optional but recommended for inventory.
   - **Photos** — upload at minimum a square hero shot. Additional photos become the thumb-strip gallery on the PDP. Order matters — the first photo is the hero.
   - **Inventory** — toggle "Track inventory" if you want stock counts to drive the "in stock" / "out of stock" badge. Otherwise the product is always treated as in stock.
   - **Variants** (e.g. Size, Fabric) — go to **Manage Options** → add option groups. Each combination becomes a variant with its own price, stock, and SKU.
4. Under **Visibility**, make sure the product is **Visible** (toggle in the top-right).
5. Add it to a **Collection** (e.g. "Futon Frames", "Mattresses") — this is what lets it appear on the right category page (PLP) on the storefront. A product without a collection won't show on any category page; it will still be reachable by direct URL.
6. **Save**.

### Where it shows up on the storefront

| Surface | URL | What it pulls |
|---|---|---|
| Category page (PLP) | `/shop/futon-frames` | Every product in that collection |
| Product detail page (PDP) | `/products/<product-slug>` | The full product — gallery, variants, price, stock, shipping estimator |
| Featured row on home | `/` | First several visible products |
| Sitemap | `/sitemap.xml` | Every product slug, picked up by Google |
| Cross-sell ("You may also like") | Bottom of every PDP | Other products in the same collection |

The product slug is auto-generated from the name. If you rename a product, the old URL 404s — keep that in mind for SEO.

---

## 3. Putting a product on sale

Two ways, both done from the Wix Dashboard. No code change needed.

### Method A — single product

1. Wix Dashboard → **Store Products** → click the product.
2. Set the **Sale price** field to the discounted price.
3. Save.

The storefront immediately:
- Shows the regular price with a strike-through and the sale price next to it.
- Adds an "On sale" badge to the PLP card.
- Includes the product on a future "On sale" row (if/when we wire one).

To take it off sale, **clear** the Sale price field.

### Method B — collection-wide sale (e.g. "20% off all mattresses")

1. Wix Dashboard → **Marketing Tools** → **Coupons** → **+ New Coupon**.
2. Type: **Percentage** or **Fixed amount**.
3. Apply to: **Specific Collection** → pick the collection.
4. Set start/end dates.
5. Set the coupon code (e.g. `SLEEPSALE25`) or check **Auto-apply at checkout** for a code-free promo.

This applies at checkout, not on the product card. If you want a percentage discount to **show as a sale price on every card**, you have to set Sale price on each product (Method A) — Wix doesn't blanket-overlay coupon discounts on PLP cards.

---

## 4. Triggering a sale lightbox / promo modal

A "lightbox" is a popup that overlays the page when a customer arrives. We use these for sitewide announcements like "20% off this weekend" or "Free white-glove on orders $1,500+".

The site does **not** have a sale lightbox built today (as of 2026-04). Adding one is a small dev task — once shipped, **you control the content from Wix CMS** without further dev help.

### How it will work after the dev hooks it up (one-time dev task)

1. **Dev** creates a Wix CMS Collection called `Promo Lightbox` with these fields:
   - `headline` (text, required) — e.g. "Spring Sale — 20% Off"
   - `subheadline` (text) — e.g. "Use code SPRING20 at checkout"
   - `ctaLabel` (text) — e.g. "Shop the sale"
   - `ctaHref` (text) — e.g. "/shop/futon-frames"
   - `imageUrl` (image, optional)
   - `active` (boolean) — turn the lightbox on/off
   - `startDate` (date) — when to start showing it
   - `endDate` (date) — when to stop
   - `dismissCookieDays` (number) — how many days before showing it again to a customer who closed it (typical: 7)
2. **Dev** wires the storefront so it reads the latest row where `active=true` AND today is between `startDate` and `endDate`.
3. **You (site owner)** then control everything from Wix Dashboard → CMS → `Promo Lightbox`:
   - To run a sale: add a row, set `active=true`, set the dates, save. Lightbox appears on the next page-load (after the 5-minute cache window).
   - To change the headline mid-sale: edit the row, save. Updates within 5 minutes.
   - To end the sale: either set `active=false` OR let `endDate` pass.
   - To run a different promo: add a new row with later `startDate`. The most-recent active row wins.

### What I (the dev) need from you to build this

To open a bead and ship the first version, I need answers to:

- **Trigger**: should it appear on **every page on first visit** (typical), or only on the **homepage**? Or only on PLPs?
- **Frequency**: once per visitor per N days? Re-show every session? Never re-show after dismissed?
- **Dismiss behavior**: does the customer close it with an X, or does it auto-dismiss after N seconds?
- **Visual style**: full-page modal, corner toast, or top-banner strip? Send a screenshot of any reference site you like.
- **Mobile**: same lightbox on mobile, or a smaller bottom-sheet? (Recommended: bottom-sheet on mobile, modal on desktop.)
- **Exit-intent only?** Some sites only show the lightbox when the cursor moves toward the close-tab area. This is more conversion-friendly but a bit more code.

Drop those answers and I'll open a bead, build the CMS schema + the storefront component, ship it, and hand you the dashboard URL where you'll manage future promos.

---

## 5. Adding a blog post

1. Wix Dashboard → **Blog** → **Posts** → **+ Add New Post**.
2. Title — shows as the H1 on the post page.
3. Body — Wix's rich text editor. Headings, images, links all render on the storefront.
4. **Excerpt** — a 1-2 sentence summary. Shows on the `/blog` index card and as the post's meta description for SEO. If you skip this, Wix uses the first 500 chars of the body.
5. **Cover image** ("hero image") — a wide image (16:9) shown above the post title. Renders on the post page.
6. **Categories / Tags** — optional. Useful if/when we add tag filtering.
7. **Publish** — top-right button.

### Where it shows up

- `/blog` — index page, latest 12 posts. Each card: hero, title, date, read-time, excerpt, click-through to the post.
- `/blog/<post-slug>` — the post page itself.
- `/sitemap.xml` — slug auto-added so Google indexes it.

The post URL slug is generated from the title. To change it without breaking links, edit the post's URL field in the Wix Blog post settings before promoting the link anywhere.

---

## 6. CMS collections (other editorial content)

Beyond Stores and Blog, Wix has generic **CMS Collections** — like spreadsheet tables that the storefront can read. These power things like:

- **FAQ entries** — if you want to add/remove FAQs without a dev change.
- **Press mentions** on `/press` — currently static; would move to CMS if/when growth makes that worthwhile.
- **Promo lightbox** (see §4) — once wired.

To add a new editable surface, the workflow is:
1. Tell me what content you want to manage from Wix (e.g. "I want to edit the FAQs on the Shipping page myself").
2. I create a Wix CMS Collection with the right fields.
3. I rewrite the page to read from that collection instead of from hard-coded text.
4. From then on, you edit the CMS rows in Wix Dashboard → CMS → \<collection name\>, and the page updates within 5 minutes.

Currently CMS-driven: blog posts.
Currently hard-coded (would need step 2-3 above to become editable): all policy pages (Shipping, Returns, Warranty, Privacy, Terms), About, Contact, Press, FAQ, /reviews.

---

## 7. Things you can't change yourself (and how to request)

These need a dev change. Open a bead (or just message rennala/melania) with what you want.

- Page copy on Shipping / Returns / Warranty / Privacy / Terms / About / Contact / Press
- Header navigation links
- Footer column content
- Site-wide colors, fonts, logo
- `/reviews` page content (the curated review cards)
- New page routes (e.g. `/sustainability`, `/style-quiz`)
- Anything in `/api/*` (delivery zone calc, contact form, newsletter signup endpoints)

The fastest way to get one of these done: send a brief mail with **what you want changed**, **why**, and **a screenshot** if visual. Most copy edits ship same-day.

---

## 8. Quick reference card

```
Add a product           → Wix → Store Products → New Product
Put on sale             → Wix → Store Products → click product → Sale price
Site-wide promo         → Wix → Marketing Tools → Coupons (or §4 lightbox)
Add a blog post         → Wix → Blog → Posts → Add New Post
Change product photo    → Wix → Store Products → click product → Media tab
Edit product description→ Wix → Store Products → click product → Description
Update inventory count  → Wix → Store Products → click product → Inventory tab
Hide a product          → Wix → Store Products → click product → Visibility off
Add a category          → Wix → Store Collections → New Collection (then assign products)
Run a coupon code       → Wix → Marketing Tools → Coupons
View site analytics     → Wix → Analytics & Reports
Customer orders         → Wix → eCommerce → Orders
```

### Caching reminder

Storefront caches: **5 minutes** for products, **5 minutes** for blog. After a Wix change, allow up to 5 minutes before assuming something is broken. Hard-refresh the storefront (Cmd+Shift+R / Ctrl+Shift+R) to bypass your browser cache.

If something doesn't appear after 10+ minutes, mail rennala — most likely it's a slug conflict, missing collection assignment, or a visibility toggle.

---

## 9. How to test your changes

You don't need a developer to verify a Wix change is live on the storefront. Quick checks for each surface:

### Test a new product appears

1. Add the product in Wix (per §2). Make sure it's **visible** and assigned to a **collection**.
2. Wait 5 minutes (cache window).
3. Open `https://carolina-futons-web.vercel.app/shop/<collection-slug>` — your product should appear in the grid.
4. Click the product card → you land on `/products/<product-slug>` (the PDP). Verify gallery, price, variants, "About this product" text.
5. Try the **shipping estimator** on the PDP — type a ZIP, confirm a lead time appears.
6. Try **add to cart** — the line item should appear in the cart drawer.

### Test a sale price

1. Set Sale price on the product in Wix.
2. Wait 5 minutes.
3. Reload the PLP and the PDP. Both should show the strike-through original + sale price + "On sale" badge.
4. Clear the Sale price → reload → the strike-through and badge disappear.

### Test a new blog post

1. Publish in Wix Blog (per §5).
2. Wait 5 minutes.
3. Visit `/blog` — your post should be at the top of the list.
4. Click through → `/blog/<post-slug>` renders the full post with hero + body.
5. Visit `/sitemap.xml` and search for your slug — Google sees it.

### Test the Getting It Home zone calculator

1. Visit `/getting-it-home`.
2. Type `28792` (Hendersonville) → "Store Local" zone.
3. Type `28801` (Asheville) → "WNC Extended" zone.
4. Type `28202` (Charlotte) → "Southeast Regional" zone.
5. Type `90210` (Beverly Hills, CA) → "outside our network."

### Test shipping at checkout (full end-to-end)

This requires (a) at least one visible product and (b) a working cart. As of 2026-04, **no products are visible on prod** — a known P1 bug (cf-gr1w). Until that's fixed, full checkout testing is blocked. Options to unblock:

- **Fastest fix**: in Wix Dashboard, confirm the Store Collections have the expected slugs (`futon-frames`, `mattresses`, `murphy-cabinet-beds`, etc.) and that products are assigned. If the slug is e.g. `futon-frames-1` because someone duplicated a collection, that's the bug.
- **Dev fallback**: ask rennala for a preview deployment with fixture products so you can verify the cart + checkout + shipping flow without depending on live Wix data.

### Test on mobile

The fastest mobile test:
1. On the desktop site, hit `Cmd+Shift+M` (Firefox) or **DevTools → Toggle device toolbar** (Chrome) → pick "iPhone 14".
2. Walk through the surfaces above.
3. For the real thing, hit the live URL on your phone — caches and click feel can differ from the simulator.

### When something looks wrong

Before assuming it's a bug, check in this order:
1. **5-minute cache** — wait, hard-refresh (Cmd+Shift+R), try again.
2. **Wix dashboard state** — is the product visible? assigned to a collection? does it have at least one photo?
3. **Slug** — does the URL slug on the storefront match what you'd expect from the product/collection name? Wix sometimes appends `-1` if there's a duplicate.
4. If 1-3 are clean and it's still wrong → mail rennala with the URL, what you expected, and what you saw.

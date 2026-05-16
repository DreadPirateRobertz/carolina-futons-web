# Brenda's Site Cheat Sheet

A one-page reference for the things you'll do most often. Print it, tape it next to the computer, you're set.

For everything else, the deep guide lives at [`SITE-OWNER-GUIDE.md`](./SITE-OWNER-GUIDE.md). Different doc, different shape — this one is "what do I click?" and that one is "how does this all fit together?"

---

## The pencil is the main thing

Almost everything you'll edit on the public site is now done **right on the page**. You sign in, switch on owner mode, and a small ✎ pencil appears next to anything you can change. Click → type → save → done. No Wix Dashboard tab needed.

The Wix Dashboard is still around — you'll use it for **products** and a couple of **CMS collections** that aren't pencil-editable yet — but it's no longer the first thing you reach for.

### Turning on owner mode (do this once per session)

1. Visit **carolinafutons.com** in any browser.
2. Sign in with your owner email.
3. Add `?cf-edit=1` to the end of the URL and reload.
4. Pencils appear next to anything you can change. They follow you across pages until you close the tab.

**If no pencils appear:** sign out and back in, then reload with `?cf-edit=1` again. Still nothing? Mail Chris — your email may not be on the owner allow-list.

---

## Where to edit what

| What you want to change | Where you go |
|---|---|
| A tagline, headline, hours, FAQ wording on the website | **Pencil** — owner mode, click the ✎ next to the text |
| A photo on the homepage or About page | **Pencil** — same, click the ✎ on the image |
| A product (price, name, photos, on-sale, hide) | **Wix Dashboard** → Store → Products |
| A blog post | **Wix Dashboard** → Blog → Posts |
| A Guide article | **Wix Dashboard** → CMS → Guides |
| A customer photo in the gallery | **Wix Dashboard** → CMS → CommunityPhotos |

If you're not sure which one — **try owner mode first.** If there's no pencil on the thing you want to change, it lives in the Wix Dashboard.

---

## Five most common tasks

### 1. Change the tagline at the bottom of the homepage

1. Sign in to **carolinafutons.com** with your owner email.
2. Add `?cf-edit=1` to the URL and reload.
3. Scroll to the bottom of the page.
4. Hover over the line **"Quality futons since 1991"** — a ✎ pencil appears.
5. Click the pencil. Type the new wording. Click **Save**.
6. Wait ~30 seconds, refresh — the new line is live.

**To undo a typo:** click the pencil again, retype, save. There's no "undo last edit" button; the next save replaces the previous one. The dev (Chris) can roll back any save from the audit trail if you need a real undo.

### 2. Update store hours on the Visit page

1. Owner mode on (steps 1–2 above — same setup for every pencil task).
2. Go to **/visit**.
3. Hover over either hours row (Sunday–Tuesday or Wednesday–Saturday) — a ✎ pencil appears next to the hours text.
4. Click → type new hours → Save.

For a temporary closure (holiday, weather), just edit the line. Edit it back when you reopen — same pencil, same place.

### 3. Replace a homepage photo

1. Owner mode on.
2. Go to the homepage.
3. Hover the photo — a **Replace** button appears in the corner.
4. Click → pick the new photo from your computer (JPG, PNG, or WebP, under 5 MB) → wait for the green check.
5. The new photo is live within ~30 seconds.

**If the upload fails:** the most common reason is the photo is too big. Save a smaller copy from your phone or computer and retry.

### 4. Add a new product

> Products still live in the Wix Dashboard. This is the one task where the pencil flow doesn't help.

1. Sign in to **manage.wix.com**.
2. Pick the carolinafutons.com site.
3. Left sidebar → **Store** → **Products** → **+ New Product**.
4. Fill in name, description, photos, price.
5. Set a **collection** (e.g. "Futon Frames" or "Mattresses") — this controls where the product shows up in the menu.
6. Click **Save**.

**The new product appears on the public site within 5 minutes.** Don't worry if it's not there immediately — that delay is normal.

### 5. Hide a product (out of stock, seasonal, retired)

1. Wix Dashboard → Store → Products.
2. Click the product.
3. Top of the product page → **Visibility** dropdown → **Hidden**.
4. Save.

Within 5 minutes the product disappears from the public site. To bring it back, flip Visibility back to **Visible**.

---

## Three things to remember

1. **The pencil is your default.** If you want to change words or a homepage photo, that's the path. Wix Dashboard is for products and a few CMS collections we haven't pencil-wired yet.
2. **Changes take 30 seconds (pencil) or 5 minutes (Wix products) to appear publicly.** That delay is the cache refreshing — there's nothing wrong if you don't see your change immediately.
3. **You can't break the site by editing.** Every pencil save is logged, and the dev (Chris) can roll back any change you didn't mean to make.

---

## When something doesn't work

- **Owner mode pencils don't appear** — you may not be signed in, or you may have forgotten the `?cf-edit=1` part of the URL. Sign out, sign back in, retype the URL.
- **The pencil is there, but Save shows an error** — read the message; it's written in plain English. Most common: the text is too long, or the file is too big. Adjust and try again.
- **You changed something via pencil and want it back** — easiest path: click the pencil again and type the previous wording. If you don't remember it, mail Chris — every save is in the audit log and rolling back is a one-line ask.
- **Wix Dashboard doesn't show the change on the public site** — wait 5 minutes, hard-refresh (Cmd-Shift-R on Mac, Ctrl-Shift-R on Windows). Still missing? Mail Chris.
- **Wix Dashboard product change saved fine but a pencil isn't appearing on the new product** — products don't have pencils (yet). They're edited in the Wix Dashboard only.

---

## Who to mail when

| Question | Mail |
|---|---|
| Owner mode broke / pencil missing | Chris |
| A product price is wrong on the site after I fixed it in Wix | Chris (cache issue) |
| I want a new section added to the homepage that doesn't exist yet | Chris |
| I want a new editable string added (e.g. a new tagline somewhere a pencil doesn't appear) | Chris |
| Wix Dashboard itself is broken | [Wix Support](https://support.wix.com/) |
| A customer can't check out | Chris (urgent) |

---

## Want the long version?

The full guide — with every editable surface, every sale-pricing trick, every CMS collection — lives at [`SITE-OWNER-GUIDE.md`](./SITE-OWNER-GUIDE.md). Read it once front-to-back so you know what's possible; come back to this cheat sheet for the day-to-day.

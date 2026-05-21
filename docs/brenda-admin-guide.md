# Brenda's Site Admin Guide

Plain-language instructions for the edits you'll make most often —
no tech background needed.

For the full reference (every editable surface, every CMS collection),
see [`SITE-OWNER-GUIDE.md`](./SITE-OWNER-GUIDE.md).

---

## How to get to the Wix Dashboard

1. Go to **manage.wix.com** in any browser.
2. Sign in with your owner email (carolinafutons@gmail.com).
3. Click **carolinafutons.com** from the list of sites.

You'll land on the Dashboard home. The left sidebar is your main navigation — that's what all the steps below refer to when they say "left sidebar."

---

## 1 · Edit a product name, price, or description

Products (futon frames, mattresses, cabinet beds, etc.) live in the Wix Store.

1. Left sidebar → **Store** → **Products**.
2. Find the product — use the search bar at the top, or scroll the list.
3. Click the product name to open the editor.
4. Change whatever you need:
   - **Name** — click the name field at the top and type.
   - **Price** — click the price field. Type the new number (no dollar sign needed).
   - **Description** — click anywhere in the description area and edit like a word processor.
5. Click **Save** (top-right corner).

**The update appears on the public site within 5 minutes.** If it's still showing the old price after 5 minutes, do a hard-refresh: **Cmd-Shift-R** on Mac, **Ctrl-Shift-R** on Windows.

---

## 2 · Hide or show a product (out of stock, seasonal, discontinued)

Use this instead of deleting — hidden products keep their history and can be brought back instantly.

**To hide:**

1. Left sidebar → **Store** → **Products**.
2. Click the product.
3. Near the top of the product page, find the **Visibility** section.
4. Change the dropdown from **Visible** to **Hidden**.
5. Click **Save**.

The product disappears from the public site within 5 minutes. Customers can no longer find or buy it.

**To show again:**

Same steps — just flip **Visibility** back to **Visible** and save.

---

## 3 · Edit a Guide article (FAQ, Getting It Home, etc.)

Guide articles (FAQ answers, the "Getting It Home" delivery guide, etc.) live in a CMS collection called **Guides**.

1. Left sidebar → **CMS** → **Content Manager**.
2. In the list of collections, click **Guides**.
3. Find the article you want to edit — the **Title** column makes them easy to scan.
4. Click the article row to open it.
5. Click into the **Body** field (the long text area) and edit the wording.
   - Use the toolbar at the top of the text area to bold, italicize, or add links.
6. When done, click **Save** (top-right).

**Changes go live within 30 seconds.** Refresh the relevant page on the site to check.

> **Tip:** Never change the **Slug** field (the short hyphenated ID). Changing it breaks the link to that article. If you accidentally change it, type the original value back in before saving.

---

## 4 · Add a customer photo to the community gallery

Customer photos appear in the gallery section on the site. They live in a collection called **CommunityPhotos**.

1. Left sidebar → **CMS** → **Content Manager**.
2. Click **CommunityPhotos**.
3. Click **+ New Item** (top-right of the collection).
4. Fill in the fields:
   - **Photo** — click the image area → **Upload Media** → pick the photo file from your computer. JPG or PNG, under 5 MB.
   - **CustomerName** — type the customer's first name (or initials if they prefer).
   - **Caption** — a short description, e.g. "Kingston frame in our living room."
   - **Approved** — check this box. Photos without this checked won't show on the site.
5. Click **Save**.

The photo appears in the gallery on the site within a few minutes.

> **If the upload fails:** the most common reason is the file is too large. Save a smaller copy from your phone or computer (under 5 MB) and try again.

> **To remove a photo:** find it in the CommunityPhotos list, open it, and uncheck **Approved**. It disappears from the site without deleting the record.

---

## 5 · Change the announcement bar message

> **Note:** This section is coming soon. The engineering team (Chris) is finishing the wiring that lets you edit the announcement bar text from the dashboard. Once it's ready, the steps will appear here — likely as a single field in a **SiteContent** collection under CMS → Content Manager.
>
> For now, to change the announcement bar text, send Chris a message with the new wording and he can update it in a few minutes.

---

## 6 · When you need engineering help — how to reach Chris

Some things are outside the dashboard (new page layouts, new features, site outages). Here's how to escalate:

| Situation | What to do |
|---|---|
| Owner mode pencils not appearing | Email Chris (chrisdealglass@gmail.com) |
| Product change saved but not showing after 10 min | Email Chris (chrisdealglass@gmail.com) — likely a cache issue |
| Wix Dashboard itself is broken or showing errors | [Wix Support](https://support.wix.com/) first; if it seems site-specific, email Chris |
| A customer can't check out | Email Chris immediately — this is urgent |
| You want a new section, new page, or new feature | File a GitHub issue (see below) |
| Something looks wrong but you're not sure who handles it | Email Chris — he'll route it |

**Filing a GitHub issue for new features or bigger changes:**

1. Go to **github.com/DreadPirateRobertz/carolina-futons-web/issues**.
2. Click **New issue**.
3. Title: one sentence describing what you want, e.g. "Add a Fabric Samples page to the main menu."
4. Body: describe it in plain language — what it should do, where it should appear, any examples.
5. Click **Submit new issue**.

Chris monitors the issue tracker and will reply with a timeline.

---

## Quick reference

| What you want to do | Where |
|---|---|
| Edit a product name, price, or description | Wix Dashboard → Store → Products |
| Hide or show a product | Wix Dashboard → Store → Products → product → Visibility |
| Edit a Guide article | Wix Dashboard → CMS → Content Manager → Guides |
| Add a community photo | Wix Dashboard → CMS → Content Manager → CommunityPhotos |
| Change the announcement bar | Email Chris (dashboard editing coming soon) |
| Report a bug or request a feature | GitHub Issues (see Section 6) |
| Edit homepage text or photos | Owner mode on carolinafutons.com — add `?cf-edit=1` to the URL |

---

## Owner mode (pencil editing on the live site)

For quick text and photo edits on the website itself — without going to the Dashboard at all:

1. Go to **carolinafutons.com** and sign in with your owner email.
2. Add `?cf-edit=1` to the end of the URL and reload.
3. A ✎ pencil appears next to anything you can change directly.
4. Click the pencil → edit → **Save**.

Changes appear within 30 seconds. If the pencils aren't showing, sign out and back in, then reload with `?cf-edit=1`.

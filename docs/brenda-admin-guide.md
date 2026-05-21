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

## 4 · Edit the homepage value props (the three "why us" cards)

The three cards below the main hero ("Hardwood, not plywood", "Sleep on it first", "White-glove delivery") are CMS-editable — you can update the heading and the body text on each one.

1. Left sidebar → **CMS** → **Content Manager**.
2. Click **SiteContent** in the collection list.
3. In the search/filter bar, type **`home.value-props.`** — this shows just the six value-prop rows.
4. Find the row you want to change and click it to open it.
5. Edit the **value** field with your new wording, then click **Save**.

**The change goes live within 30 seconds.**

**Rows in this section:**

| Key | What it controls |
|---|---|
| `home.value-props.0.title` | Heading on the first card (currently "Hardwood, not plywood") |
| `home.value-props.0.body` | Body text on the first card |
| `home.value-props.1.title` | Heading on the second card (currently "Sleep on it first") |
| `home.value-props.1.body` | Body text on the second card |
| `home.value-props.2.title` | Heading on the third card (currently "White-glove delivery") |
| `home.value-props.2.body` | Body text on the third card |

> **Tip:** Each card heading should be 3–5 words — short enough to scan at a glance. The body can be 1–2 sentences.

---

## 5 · Edit the About page copy

The entire About page — the intro, the beliefs section, the location blurb, and the team paragraph — is CMS-editable.

1. Left sidebar → **CMS** → **Content Manager**.
2. Click **SiteContent**.
3. In the search/filter bar, type **`about.`** — this shows just the About page rows.
4. Find the row you want to change and click it.
5. Edit the **value** field, then click **Save**.

**The change goes live within 30 seconds.**

**Rows in this section:**

| Key | What it controls |
|---|---|
| `about.intro.eyebrow` | Small label above the main heading (e.g. "Our story") |
| `about.intro.heading` | Main page heading (e.g. "About Carolina Futons") |
| `about.intro.subheading` | One-sentence subheading below the main heading |
| `about.intro.lede` | Opening paragraph of the About page |
| `about.beliefs.heading` | Heading for the beliefs / values section |
| `about.beliefs.body-1` | First paragraph in the beliefs section |
| `about.beliefs.body-2` | Second paragraph in the beliefs section |
| `about.location.heading` | Heading for the location section |
| `about.location.body-1` | Paragraph describing the showroom location |
| `about.team.heading` | Heading for the team section |
| `about.team.body` | Paragraph introducing the team |

---

## 6 · Edit the Contact page headings

The section headings on the Contact page are CMS-editable. Use this when you want to update the intro, change the "Reach us directly" heading, or tweak the appointment-booking blurb.

1. Left sidebar → **CMS** → **Content Manager**.
2. Click **SiteContent**.
3. In the search/filter bar, type **`contact.`** — this shows just the Contact page rows.
4. Find the row you want to change and click it.
5. Edit the **value** field, then click **Save**.

**The change goes live within 30 seconds.**

**Rows in this section:**

| Key | What it controls |
|---|---|
| `contact.eyebrow` | Small label above the main heading (e.g. "Contact") |
| `contact.intro.heading` | Main heading on the Contact page |
| `contact.intro.body` | Intro paragraph below the heading |
| `contact.direct.heading` | Heading above the phone / email block |
| `contact.appointment.heading` | Heading above the showroom appointment section |
| `contact.appointment.body-suffix` | Sentence appended after the appointment booking link |
| `contact.form.heading` | Heading above the contact form |

> **Note:** Phone number, email address, and physical address are set in code. To change those, email Chris (chrisdealglass@gmail.com).

---

## 7 · Add a customer photo to the community gallery

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

## 8 · Change the announcement bar message

The announcement bar at the top of every page rotates through up to 5 messages. You can edit any of them from the Wix Dashboard — no code deploy needed.

1. Left sidebar → **CMS** → **Content Manager**.
2. Click **SiteContent** in the collection list.
3. In the search/filter bar at the top of the collection, type **`announcement.`** — this filters the list down to just the announcement bar rows.
4. Find the row you want to change (e.g. `announcement.rotation.0.message` is the first message in the rotation).
5. Click the row to open it, then edit the **value** field with your new wording.
6. Click **Save**.

**The change goes live within 30 seconds.** Refresh the site to confirm.

**Rows in this section:**

| Key | What it controls |
|---|---|
| `announcement.rotation.0.message` | First rotating message |
| `announcement.rotation.1.message` | Second rotating message |
| `announcement.rotation.2.message` | Third rotating message |
| `announcement.rotation.3.message` | Fourth rotating message (paired with a button link below) |
| `announcement.rotation.3.cta-label` | Button label for the fourth message (e.g. "Order free swatches") |
| `announcement.rotation.3.cta-href` | Button destination URL for the fourth message (e.g. `/swatch-request`) |
| `announcement.rotation.4.message` | Fifth rotating message |

> **Tip:** Leave a row's **value** blank (or delete the row) to fall back to the original shipped wording. You don't have to keep every slot filled — the bar still works with fewer messages.

> **To remove the CTA button on message 4:** clear both the `cta-label` and `cta-href` values. When either is blank, no button renders.

---

## 9 · When you need engineering help — how to reach Chris

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
| Edit homepage value props ("Hardwood, not plywood" etc.) | Wix Dashboard → CMS → Content Manager → SiteContent → filter `home.value-props.` |
| Edit About page copy | Wix Dashboard → CMS → Content Manager → SiteContent → filter `about.` |
| Edit Contact page headings | Wix Dashboard → CMS → Content Manager → SiteContent → filter `contact.` |
| Add a community photo | Wix Dashboard → CMS → Content Manager → CommunityPhotos |
| Change the announcement bar | Wix Dashboard → CMS → Content Manager → SiteContent → filter `announcement.` |
| Report a bug or request a feature | GitHub Issues (see Section 9) |
| Edit homepage text or photos | Owner mode on carolinafutons.com — add `?cf-edit=1` to the URL |

---

## Owner mode (pencil editing on the live site)

For quick text and photo edits on the website itself — without going to the Dashboard at all:

1. Go to **carolinafutons.com** and sign in with your owner email.
2. Add `?cf-edit=1` to the end of the URL and reload.
3. A ✎ pencil appears next to anything you can change directly.
4. Click the pencil → edit → **Save**.

Changes appear within 30 seconds. If the pencils aren't showing, sign out and back in, then reload with `?cf-edit=1`.

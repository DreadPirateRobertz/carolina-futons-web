# GSC + Bing Webmaster Tools Submission Runbook

**Bead:** cf-3qt.5.7  
**Gate:** cf-3qt.8 DNS cutover — do NOT submit until `www.carolinafutons.com` resolves to the new Next.js deployment.

---

## Prerequisites

- [ ] DNS cutover complete — `www.carolinafutons.com` points at Vercel
- [ ] `robots` in `layout.tsx` flipped to `{ index: true, follow: true }` and deployed
- [ ] `/sitemap.xml` returns valid XML at `https://www.carolinafutons.com/sitemap.xml`

---

## Step 1 — Google Search Console

### 1a. Get the verification token

1. Go to [https://search.google.com/search-console](https://search.google.com/search-console)
2. Click **Add property** → choose **URL prefix** → enter `https://www.carolinafutons.com`
3. Under **Verify ownership**, select **HTML tag**
4. Copy the `content=` value (looks like `abc123XYZ...`). **Do not copy the full `<meta>` tag.**

### 1b. Wire the token

```bash
# In Vercel dashboard → Settings → Environment Variables → Production
GOOGLE_SITE_VERIFICATION=<paste content= value here>
```

Redeploy production (or trigger a redeploy from Vercel dashboard). Verify the tag is present:

```bash
curl -s https://www.carolinafutons.com | grep google-site-verification
# Expected: <meta name="google-site-verification" content="abc123XYZ..." />
```

### 1c. Verify ownership in GSC

Back in GSC, click **Verify**. It will fetch the live URL and confirm the meta tag.

### 1d. Submit the sitemap

1. In GSC left sidebar: **Sitemaps**
2. Enter `sitemap.xml` in the input field → **Submit**
3. GSC will crawl it within 24–72 hours. Status should change to **Success**.
4. Record the URL count from GSC once indexed — that's the AC metric for cf-3qt.5.7.

---

## Step 2 — Bing Webmaster Tools

### 2a. Get the verification token

1. Go to [https://www.bing.com/webmasters](https://www.bing.com/webmasters)
2. Add site → enter `https://www.carolinafutons.com`
3. Choose **Meta tag** verification
4. Copy the `content=` value from the `msvalidate.01` tag.

### 2b. Wire the token

```bash
# In Vercel dashboard → Settings → Environment Variables → Production
BING_SITE_VERIFICATION=<paste msvalidate.01 content= value here>
```

Redeploy. Verify:

```bash
curl -s https://www.carolinafutons.com | grep msvalidate
# Expected: <meta name="msvalidate.01" content="..." />
```

### 2c. Verify and submit sitemap

1. In Bing WMT: click **Verify**
2. Once verified: **Sitemaps** → **Submit sitemap** → enter `https://www.carolinafutons.com/sitemap.xml`

---

## Acceptance Criteria

- GSC shows sitemap status **Success** with N URLs indexed (record N in cf-3qt.5.7 comment)
- Bing WMT shows sitemap submitted and verified
- Both verification meta tags visible in `curl` output above

---

## Rollback

If verification tags cause issues (unlikely), remove env vars in Vercel and redeploy.
`resolveVerification()` returns `undefined` when vars are unset — no tags emitted.

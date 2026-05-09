#!/usr/bin/env node
// cfw-y2i: capture full-page screenshots of cfw + carolinafutons.com (prod
// Wix) at 1280/768/375 across the 8 highest-traffic pages. Output lands in
// docs/visual-parity-audit-2026-05-09/{cfw,prod}/<viewport>/<slug>.png.
//
// Run:  node scripts/capture-parity.mjs
//
// Both origins are public — no auth, no PII concerns.

import { chromium } from "playwright";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const CFW = process.env.CFW_BASE ?? "https://carolina-futons-web.vercel.app";
const PROD = process.env.PROD_BASE ?? "https://www.carolinafutons.com";

// Per-origin URL maps — cfw and Wix prod use different routing conventions.
//   cfw:   /shop/<category>, /products/<slug>, /cart, /visit
//   prod:  /<category>,      /product-page/<slug>, /cart-page, /contact (no /visit)
// Discovered 2026-05-09 by walking the prod nav. Keeps the 8 audit slots
// consistent across origins so every cfw page has a meaningful prod
// counterpart (or an explicit "no equivalent" stub for the doc).
const SLUGS = [
  "home",
  "shop-futon-frames",
  "shop-mattresses",
  "pdp-kingston",
  "pdp-solstice",
  "cart-empty",
  "visit",
  "about",
];

const PATHS = {
  cfw: {
    home: "/",
    "shop-futon-frames": "/shop/futon-frames",
    "shop-mattresses": "/shop/mattresses",
    "pdp-kingston": "/products/kingston-futon-frame",
    "pdp-solstice": "/products/solstice-futon-frame",
    "cart-empty": "/cart",
    visit: "/visit",
    about: "/about",
  },
  prod: {
    home: "/",
    "shop-futon-frames": "/futon-frames",
    "shop-mattresses": "/mattresses",
    "pdp-kingston": "/product-page/kingston",
    "pdp-solstice": "/product-page/solstice",
    "cart-empty": "/cart-page",
    visit: "/contact", // no /visit on prod; /contact is the closest peer
    about: "/about",
  },
};

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "375", width: 375, height: 812 },
];

const OUT = path.resolve("docs/visual-parity-audit-2026-05-09");

// Wait helpers:
//  - networkidle is unreliable on Wix Studio (long-poll background pings keep
//    it from settling), so we time-bound it.
//  - After idle, we scroll the page to trigger lazy-loaded imagery, then
//    settle for a beat so animations land in their resting frame.
async function settle(page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 8000 });
  } catch {
    /* fall through — bounded wait */
  }
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 600;
      const id = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(id);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
  await page.waitForTimeout(800);
}

async function captureOrigin(label, base) {
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const dir = path.join(OUT, label, vp.name);
      await mkdir(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 cfw-parity-bot",
      });
      const page = await ctx.newPage();
      const paths = PATHS[label];
      for (const slug of SLUGS) {
        const relative = paths[slug];
        if (!relative) {
          process.stdout.write(`→ ${label}/${vp.name}/${slug} ... skipped (no path)\n`);
          continue;
        }
        const url = `${base}${relative}`;
        const out = path.join(dir, `${slug}.png`);
        process.stdout.write(`→ ${label}/${vp.name}/${slug} ... `);
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          await settle(page);
          await page.screenshot({ path: out, fullPage: true });
          process.stdout.write("ok\n");
        } catch (err) {
          process.stdout.write(`FAIL (${err?.message ?? err})\n`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

(async () => {
  await captureOrigin("cfw", CFW);
  await captureOrigin("prod", PROD);
})();

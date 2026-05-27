// One-shot README screenshot capture.
//
// Drives a headless Chromium via puppeteer-core against the local
// Herd Flarum forum and saves four full-viewport PNGs to
// docs/screenshots/. Run after a `php flarum assets:publish` so the
// CSS/JS the page references is the latest.
//
// Usage:  node scripts/screenshots.mjs

import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const executablePath = CHROME_PATHS.find(existsSync);
if (!executablePath) {
  console.error('No Chrome / Chromium binary found. Install Chrome.');
  process.exit(1);
}

const BASE = process.env.GN_FORUM_URL || 'http://flarum.test';

const SHOTS = [
  { name: 'homepage-light',    url: '/',                       theme: 'light' },
  { name: 'homepage-dark',     url: '/',                       theme: 'dark'  },
  { name: 'discussion-light',  url: '/d/6-welcome-to-respawn', theme: 'light' },
  { name: 'discussion-dark',   url: '/d/6-welcome-to-respawn', theme: 'dark'  },
];

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--ignore-certificate-errors', '--disable-features=Translate'],
  defaultViewport: { width: 1366, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();

try {
  for (const shot of SHOTS) {
    console.log(`→ ${shot.name} (${shot.theme})  ${BASE}${shot.url}`);

    // Stamp data-theme BEFORE the SPA boots — Flarum reads it on hydrate.
    await page.evaluateOnNewDocument((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, shot.theme);

    await page.goto(`${BASE}${shot.url}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });

    // Re-stamp + force a Mithril sync redraw so the discussion list
    // populates before we shoot (auto-redraw is suspended on hidden tabs
    // in headless mode).
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
      if (window.m && window.m.redraw && window.m.redraw.sync) {
        window.m.redraw.sync();
      }
    }, shot.theme);
    await new Promise((r) => setTimeout(r, 700));

    await page.screenshot({
      path: join(OUT, `${shot.name}.png`),
      type: 'png',
      fullPage: false,
    });
    console.log(`  ✓  ${shot.name}.png`);
  }
} finally {
  await browser.close();
}

console.log(`\nSaved to ${OUT}`);

import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE   = 'http://localhost:5173';

const SHOTS = [
  { file: 'forum-index-light.png',  url: '/index.html',  dark: false, scrollY: 0    },
  { file: 'group-feed-light.png',   url: '/posts.html',  dark: false, scrollY: 0    },
  { file: 'group-feed-poll.png',    url: '/posts.html',  dark: false, scrollY: 1500 },
  { file: 'group-feed-dark.png',    url: '/posts.html',  dark: true,  scrollY: 0    },
  { file: 'forum-index-dark.png',   url: '/index.html',  dark: true,  scrollY: 0    },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

for (const shot of SHOTS) {
  await page.emulateMediaFeatures([{
    name: 'prefers-color-scheme',
    value: shot.dark ? 'dark' : 'light',
  }]);
  await page.goto(`${BASE}${shot.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
  if (shot.scrollY) await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
  await new Promise(r => setTimeout(r, 400));
  const dest = path.join(OUT, shot.file);
  await page.screenshot({ path: dest, type: 'png' });
  console.log('✓', shot.file);
}

await browser.close();
console.log('Done — screenshots in docs/screenshots/');

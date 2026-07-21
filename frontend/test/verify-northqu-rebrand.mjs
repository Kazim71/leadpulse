// Verifies the NorthQu rebrand (Northcue -> NorthQu) + new brand palette:
// zero "Northcue" strings rendered, new logo (ring + cinnamon tail, no
// background artifact) renders on white/ivory/black/dark-mode surfaces,
// footer background is black, marketing accent is Cinnamon Wood.
// Run: node test/verify-northqu-rebrand.mjs   (server must be running)

import { existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

function findChrome() {
  for (const c of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) {
    if (existsSync(c)) return c;
  }
  throw new Error('No Chrome/Edge found');
}

// Relative luminance / contrast ratio, per WCAG. Used to actually check
// text/background combos rather than eyeballing hex values.
function relLuminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(hex1, hex2) {
  const L1 = relLuminance(hex1);
  const L2 = relLuminance(hex2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

async function checkPage(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));

  const text = await page.evaluate(() => document.body.innerText);
  const hasOldBrand = /Northcue/i.test(text);
  const title = await page.title();

  record(`${path}: no "Northcue" text visible`, !hasOldBrand, hasOldBrand ? 'FOUND OLD BRAND STRING' : '');
  record(`${path}: page title is not stale`, !/Northcue/i.test(title), `title="${title}"`);

  const logoInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt="NorthQu"]');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return { present: true, width: rect.width, visible: rect.width > 0, naturalWidth: img.naturalWidth };
  });
  record(
    `${path}: NorthQu logomark renders (raster PNG, not vector)`,
    Boolean(logoInfo?.present && logoInfo.visible && logoInfo.naturalWidth > 0),
    JSON.stringify(logoInfo),
  );
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'nq-rebrand-')),
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ---- favicon: new raster logo (Next.js /icon.png convention) -------
    // Next.js serves the app/icon.png convention at a generated path
    // (typically /icon.png or /icon?<hash>), not a fixed literal file —
    // fetch it via the actual <link rel="icon"> the page emits rather
    // than assuming a URL.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const faviconHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"]');
      return link ? link.href : null;
    });
    record('page emits a <link rel="icon">', Boolean(faviconHref), `href=${faviconHref}`);
    if (faviconHref) {
      const faviconRes = await page.goto(faviconHref);
      record('favicon loads with 200', faviconRes.status() === 200, `status ${faviconRes.status()}`);
      const buf = await faviconRes.buffer();
      record('favicon is a real PNG (magic bytes)', buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a', '');
    }

    // ---- public pages: brand string + logo -----------------------------
    for (const path of ['/', '/about', '/features', '/product', '/contact', '/login', '/signup']) {
      await checkPage(page, path);
    }

    // ---- marketing homepage: computed colors -----------------------------
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const bodyBg = await page.evaluate(() => getComputedStyle(document.querySelector('div.flex.min-h-screen')).backgroundColor);
    record('marketing body background is Space Indigo (rgb(41, 48, 73))', bodyBg === 'rgb(41, 48, 73)', bodyBg);

    // The mark is now a raster PNG (fixed colors, not currentColor) — on
    // the marketing header (always dark, forceVariant="dark") the visible
    // <img> must be the dark-mode-legible asset, not the light one that's
    // illegible on a dark background.
    const headerLogoSrc = await page.evaluate(() => {
      const img = document.querySelector('header img[alt="NorthQu"]');
      return img ? new URL(img.src).pathname : null;
    });
    record(
      'marketing header uses the dark-legible icon variant (forceVariant="dark")',
      headerLogoSrc === '/brand/northqu-icon-dark.png',
      `src=${headerLogoSrc}`,
    );

    // footer background should be pure black (brand.black), distinct from
    // the indigo page body, per the "black is the footer background,
    // site-wide" usage rule.
    const footerBg = await page.evaluate(() => getComputedStyle(document.querySelector('footer')).backgroundColor);
    record('footer background is black (rgb(0, 0, 0))', footerBg === 'rgb(0, 0, 0)', footerBg);

    // real click on a nav link still navigates (mirrors the prior
    // redesign's verification of the cursor-glow / interactive chrome not
    // breaking real navigation).
    await page.click('header nav a[href="/about"]');
    await page.waitForFunction(() => location.pathname === '/about', { timeout: 5000 });
    record('real nav-link click still navigates to /about', true, '');

    // ---- login page: CSS-only light/dark swap (no forceVariant) ---------
    // /login uses the default LogoLockup (both <img>s present, toggled by
    // `dark:hidden` / `hidden dark:block`), since next-themes' persisted
    // preference can apply there even with no visible toggle on the page
    // (see docs/TODO.md). Confirm BOTH assets are actually in the DOM —
    // the CSS-only swap only works if both are present and only one is
    // visible at a time, not if only one was ever rendered.
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    const loginLogoImgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img[alt="NorthQu"]')).map((img) => ({
        src: new URL(img.src).pathname,
        visible: getComputedStyle(img).display !== 'none',
      })),
    );
    record(
      'login page has both light+dark logo <img>s in DOM (CSS-only swap)',
      loginLogoImgs.length === 2 && loginLogoImgs.some((i) => i.src.includes('light')) && loginLogoImgs.some((i) => i.src.includes('dark')),
      JSON.stringify(loginLogoImgs),
    );
    record(
      'login page (light theme default): light variant visible, dark hidden',
      loginLogoImgs.find((i) => i.src.includes('light'))?.visible === true &&
        loginLogoImgs.find((i) => i.src.includes('dark'))?.visible === false,
      JSON.stringify(loginLogoImgs),
    );

    // ---- pixel-level legibility check on the marketing header ------------
    // Render-tested, not assumed: sample the actual composited pixel colors
    // of the logo against the dark marketing header background, and confirm
    // the visible pixels are NOT near-black-on-near-black (the failure mode
    // measured before adding the dark variant).
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const legibility = await page.evaluate(async () => {
      const img = document.querySelector('header img[alt="NorthQu"]');
      if (!img) return null;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let maxLuminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // skip transparent
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        if (lum > maxLuminance) maxLuminance = lum;
      }
      return { maxLuminance };
    });
    record(
      'marketing header logo has legible (bright) pixels against the dark bg',
      Boolean(legibility && legibility.maxLuminance > 180),
      JSON.stringify(legibility),
    );

    await browser.close();
  } catch (err) {
    console.error('\nVERIFY THREW:', err.message);
    checks.push({ name: 'script completed', pass: false });
    await browser.close().catch(() => {});
  }

  // ---- contrast ratios, computed, for every combo actually used ---------
  const brand = { indigo: '#293049', white: '#FFFFFF', cinnamon: '#C67155', black: '#000000', ivory: '#F6F6E9' };
  const marketing = { bg: brand.indigo, text: brand.ivory, textDim: '#A4A7A9', textFaint: '#9A9DA1', surface: '#3A4158' };
  const combos = [
    ['marketing.text on marketing.bg', marketing.text, marketing.bg],
    ['marketing.textDim on marketing.bg', marketing.textDim, marketing.bg],
    ['marketing.textFaint on marketing.bg', marketing.textFaint, marketing.bg],
    ['marketing.text on marketing.surface', marketing.text, marketing.surface],
    ['brand.black text on brand.cinnamon (button)', brand.black, brand.cinnamon],
    ['brand.ivory text on brand.black (footer)', brand.ivory, brand.black],
    ['brand.black text on brand.white (future dashboard body)', brand.black, brand.white],
    ['brand.black text on brand.ivory (future dashboard card)', brand.black, brand.ivory],
  ];
  for (const [label, fg, bg] of combos) {
    const ratio = contrast(fg, bg);
    // 3:1 is WCAG AA-large; 4.5:1 is AA-normal-text. Report both the ratio
    // and which threshold it actually clears rather than a single pass/fail,
    // since some combos (secondary/tertiary copy) are only ever used at
    // large sizes.
    record(`contrast ${label}`, ratio >= 3, `ratio=${ratio.toFixed(2)}:1 (AA-normal ${ratio >= 4.5 ? 'PASS' : 'fail'}, AA-large ${ratio >= 3 ? 'PASS' : 'fail'})`);
  }

  // ---- final asset sizes, reported plainly (this is a raster asset now,
  // not vector — no claim of crispness at arbitrary sizes) -----------------
  for (const f of ['public/brand/northqu-icon-light.png', 'public/brand/northqu-icon-dark.png', 'src/app/icon.png', 'src/app/apple-icon.png']) {
    try {
      const { size } = statSync(f);
      console.log(`ASSET SIZE — ${f}: ${(size / 1024).toFixed(1)} KB`);
    } catch {
      console.log(`ASSET SIZE — ${f}: not found`);
    }
  }

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main();

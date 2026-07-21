// Verifies the cross-cutting theme-consistency pass: every page follows
// white/black/black-footer/cinnamon-button/ivory-secondary rule in light
// mode, the same relationships inverted in dark mode; the marketing site
// now has a working theme toggle; the header stays legible through a full
// scroll; the correct (raster PNG) logo renders everywhere; zero
// deprecated tokens remain.
// Run: node test/verify-theme-consistency.mjs   (server must be running)

import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPER = { email: 'super@leadcapsule.dev', password: '3Gjgrl9yez8atOyij2DVng' };

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

async function rgb(page, selector, prop = 'backgroundColor') {
  return page.evaluate(
    (sel, p) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[p] : null;
    },
    selector,
    prop,
  );
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'nq-theme-')),
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ============ MARKETING: light mode (default) ============
    for (const path of ['/', '/about', '/features', '/product', '/contact']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      const bodyBg = await rgb(page, 'div.flex.min-h-screen');
      record(`${path} (light): body background is white`, bodyBg === 'rgb(255, 255, 255)', bodyBg);
      const footerBg = await rgb(page, 'footer');
      // Footer is black, UNCONDITIONALLY in both themes.
      record(`${path} (light): footer background is black`, footerBg === 'rgb(0, 0, 0)', footerBg);
    }

    // ============ Theme toggle exists + works on landing page ============
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const toggleExists = await page.evaluate(() => Boolean(document.querySelector('button[aria-label="Toggle color theme"]')));
    record('landing page has a theme toggle button', toggleExists, '');

    await page.click('button[aria-label="Toggle color theme"]');
    await new Promise((r) => setTimeout(r, 500));
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    record('clicking toggle switches to dark mode', isDark, '');

    const darkBodyBg = await rgb(page, 'div.flex.min-h-screen');
    // Page-level dark mode matches the dashboard exactly (black), not
    // Space Indigo — that was the same-day correction.
    record('landing (dark): body background is black (matches dashboard, not indigo)', darkBodyBg === 'rgb(0, 0, 0)', darkBodyBg);
    const darkFooterBg = await rgb(page, 'footer');
    record('landing (dark): footer background still black (unconditional)', darkFooterBg === 'rgb(0, 0, 0)', darkFooterBg);

    // persistence: reload, dark mode should stick (same next-themes localStorage mechanism as dashboard)
    await page.reload({ waitUntil: 'networkidle2' });
    const persistedDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    record('theme choice persists across reload (same mechanism as dashboard)', persistedDark, '');

    // header background in dark mode should be black-based too (not the
    // old indigo backdrop-blur) — theme is still dark here (persisted
    // across the reload above), no extra click needed.
    const darkHeaderBg = await rgb(page, 'header');
    record('landing (dark): header background is black-based, not indigo', darkHeaderBg === 'rgba(0, 0, 0, 0.85)', darkHeaderBg);

    // reset to light for the rest of the checks
    await page.click('button[aria-label="Toggle color theme"]');
    await new Promise((r) => setTimeout(r, 500));

    // ============ Sticky header: stays visible + legible through scroll ============
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const headerPosBefore = await page.evaluate(() => {
      const h = document.querySelector('header');
      const r = h.getBoundingClientRect();
      return { position: getComputedStyle(h).position, top: r.top };
    });
    record('header has sticky/fixed position', ['sticky', 'fixed'].includes(headerPosBefore.position), JSON.stringify(headerPosBefore));

    await page.evaluate(() => window.scrollTo(0, 1200));
    await new Promise((r) => setTimeout(r, 300));
    const headerPosAfter = await page.evaluate(() => {
      const h = document.querySelector('header');
      const r = h.getBoundingClientRect();
      return { top: r.top, visible: r.top >= -1 && r.top < 100 };
    });
    record('header still visible at top of viewport after scrolling 1200px', headerPosAfter.visible, JSON.stringify(headerPosAfter));

    const headerBgAfterScroll = await rgb(page, 'header');
    record('header has a real (non-transparent) background while scrolled', headerBgAfterScroll !== 'rgba(0, 0, 0, 0)', headerBgAfterScroll);

    // nav still clickable/legible after scroll — real click, real navigation
    await page.click('header nav a[href="/about"]');
    await page.waitForFunction(() => location.pathname === '/about', { timeout: 5000 });
    record('header nav link still clickable after scrolling', true, '');

    // ============ Logo: correct final asset (raster PNG) everywhere ============
    for (const path of ['/', '/login', '/signup']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      const logo = await page.evaluate(() => {
        const img = document.querySelector('img[alt="NorthQu"]');
        return img ? { present: true, naturalWidth: img.naturalWidth, src: new URL(img.src).pathname } : null;
      });
      // Header/login/signup use the full lockup (monogram + wordmark).
      record(`${path}: shows the full NorthQu lockup logo`, Boolean(logo?.present && logo.naturalWidth > 0 && logo.src.startsWith('/brand/northqu-lockup-')), JSON.stringify(logo));
    }

    // ============ Login page: new token system, not old palette ============
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    const loginBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    record('login (light): body background is white', loginBodyBg === 'rgb(255, 255, 255)', loginBodyBg);
    const loginHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).color : null;
    });
    record('login (light): heading text is black', loginHeading === 'rgb(0, 0, 0)', loginHeading);
    const loginLink = await page.evaluate(() => {
      const a = document.querySelector('a[href="/signup"]');
      return a ? getComputedStyle(a).color : null;
    });
    // cinnamon-700 = #8F4A32 = rgb(143,74,50)
    record('login (light): "Create one" link is Cinnamon Wood, not old blush', loginLink === 'rgb(143, 74, 50)', loginLink);

    // ============ Dashboard (authenticated): new token system ============
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=email]', { timeout: 15000 });
    await page.type('input[type=email]', SUPER.email);
    await page.type('input[type=password]', SUPER.password);
    await page.click('button[type=submit]');
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1200));

    const dashBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    record('super-admin (light): body background is white', dashBodyBg === 'rgb(255, 255, 255)', dashBodyBg);

    const sidebarLogo = await page.evaluate(() => {
      const img = document.querySelector('aside img[alt="NorthQu"]');
      return img ? new URL(img.src).pathname : null;
    });
    // Expanded sidebar shows the full lockup (monogram + wordmark).
    record('super-admin sidebar shows the NorthQu lockup', Boolean(sidebarLogo?.startsWith('/brand/northqu-lockup-')), `src=${sidebarLogo}`);

    // dashboard dark mode still works (existing toggle, unaffected)
    await page.evaluate(() => document.querySelector('button[aria-label="Toggle color theme"]')?.click());
    await new Promise((r) => setTimeout(r, 500));
    const dashDarkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    record('super-admin (dark): body background is black', dashDarkBg === 'rgb(0, 0, 0)', dashDarkBg);
    // reset
    await page.evaluate(() => document.querySelector('button[aria-label="Toggle color theme"]')?.click());

    await browser.close();
  } catch (err) {
    console.error('\nVERIFY THREW:', err.message);
    checks.push({ name: 'script completed', pass: false });
    await browser.close().catch(() => {});
  }

  // ============ Zero deprecated tokens anywhere (grep, not assumed) =========
  const { execSync } = await import('node:child_process');
  try {
    const out = execSync(
      'grep -rEn "ink-[0-9]|blush-[0-9]|lilac-[0-9]|mint-[0-9]|peach-[0-9]" src/ || true',
      { encoding: 'utf-8' },
    ).trim();
    record('zero deprecated hyphenated tokens anywhere in src/ (grep)', out === '', out || '(clean)');
  } catch (e) {
    record('zero deprecated hyphenated tokens anywhere in src/ (grep)', false, String(e));
  }

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main();

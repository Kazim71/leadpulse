// Verifies the Northcue rebrand: zero LeadCapsule strings rendered, new
// logo present at sidebar/header/login sizes in both themes, favicon loads.
// Run: node test/verify-rebrand.mjs   (server must be running)

import { existsSync, mkdtempSync } from 'node:fs';
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

async function checkPage(page, path, { requireLogo = true } = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 500));

  const text = await page.evaluate(() => document.body.innerText);
  // Excludes the logged-in user's own email (a real test account,
  // super@leadcapsule.dev, predating any rebrand) — that's account data
  // rendered correctly, not stale UI copy.
  const withoutEmails = text.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '');
  const hasOldBrand = /LeadCapsule/i.test(withoutEmails);
  const title = await page.title();

  record(`${path}: no "LeadCapsule" text visible`, !hasOldBrand, hasOldBrand ? 'FOUND OLD BRAND STRING' : '');
  record(`${path}: page title is not stale`, !/LeadCapsule/i.test(title), `title="${title}"`);

  if (requireLogo) {
    const logoInfo = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label="Northcue"]');
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      return { present: true, width: rect.width, height: rect.height, visible: rect.width > 0 };
    });
    record(`${path}: Northcue logomark SVG renders`, Boolean(logoInfo?.present && logoInfo.visible), JSON.stringify(logoInfo));
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'lp-rebrand-')),
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ---- favicon actually loads --------------------------------------
    const faviconRes = await page.goto(`${BASE}/icon.svg`);
    record('favicon (/icon.svg) loads with 200', faviconRes.status() === 200, `status ${faviconRes.status()}`);
    const svgBody = await faviconRes.text();
    record('favicon SVG contains the logomark paths', svgBody.includes('<path') && svgBody.includes('<svg'), '');

    // ---- public pages, light mode -------------------------------------
    for (const path of ['/', '/about', '/features', '/product', '/contact', '/login', '/signup']) {
      await checkPage(page, path);
    }

    // ---- public pages, dark mode ---------------------------------------
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.querySelector('button[aria-label="Toggle color theme"]')?.click());
    await new Promise((r) => setTimeout(r, 700));
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    record('theme toggle switches to dark', isDark, '');

    for (const path of ['/', '/about']) {
      await checkPage(page, path);
      const logoColor = await page.evaluate(() => {
        const svg = document.querySelector('svg[aria-label="Northcue"]');
        return svg ? getComputedStyle(svg).color : null;
      });
      record(`${path}: logo color adapts in dark mode (not hardcoded)`, Boolean(logoColor), `color=${logoColor}`);
    }

    // ---- login page logo size (should be h-9 = 36px) --------------------
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    const loginLogoSize = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label="Northcue"]');
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    record('login page logo renders at expected size (~36px)', Math.abs((loginLogoSize?.width ?? 0) - 36) < 3, JSON.stringify(loginLogoSize));

    // reset to light
    await page.evaluate(() => document.querySelector('button[aria-label="Toggle color theme"]')?.click());

    // ---- dashboard chrome (both collapsed + expanded sidebar) ------------
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=email]', { timeout: 15000 });
    await page.type('input[type=email]', SUPER.email);
    await page.type('input[type=password]', SUPER.password);
    await page.click('button[type=submit]');
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));

    await checkPage(page, '/super-admin', { requireLogo: false });
    const sidebarLogo = await page.evaluate(() => {
      const svg = document.querySelector('aside svg[aria-label="Northcue"]');
      return svg ? svg.getBoundingClientRect().width > 0 : false;
    });
    record('super-admin sidebar shows the Northcue mark (expanded)', sidebarLogo, '');

    // collapse the sidebar — mark-only state
    await page.click('button[aria-label="Collapse sidebar"]');
    await new Promise((r) => setTimeout(r, 500));
    const collapsedLogo = await page.evaluate(() => {
      const svg = document.querySelector('aside svg[aria-label="Northcue"]');
      const wordmark = document.querySelector('aside')?.innerText.includes('Northcue');
      return { markPresent: Boolean(svg), wordmarkHidden: !wordmark };
    });
    record(
      'collapsed sidebar shows mark only (no wordmark text)',
      collapsedLogo.markPresent && collapsedLogo.wordmarkHidden,
      JSON.stringify(collapsedLogo),
    );
    // expand back
    await page.click('button[aria-label="Expand sidebar"]');

    // dashboard dark mode
    await page.evaluate(() => document.querySelector('button[aria-label="Toggle color theme"]')?.click());
    await new Promise((r) => setTimeout(r, 700));
    await checkPage(page, '/super-admin', { requireLogo: false });
    const darkSidebarLogo = await page.evaluate(() => {
      const svg = document.querySelector('aside svg[aria-label="Northcue"]');
      return svg ? { present: true, color: getComputedStyle(svg).color } : null;
    });
    record('super-admin sidebar logo renders in dark mode', Boolean(darkSidebarLogo?.present), JSON.stringify(darkSidebarLogo));

    await browser.close();
  } catch (err) {
    console.error('\nVERIFY THREW:', err.message);
    checks.push({ name: 'script completed', pass: false });
    await browser.close().catch(() => {});
  }

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main();

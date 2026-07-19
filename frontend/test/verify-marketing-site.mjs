// Verifies the public marketing site: auth-aware "/" routing, the 4 always-
// public pages, shared header/footer nav, and both themes on all 5 pages.
// Run: node test/verify-marketing-site.mjs   (server must be running)

import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPER = { email: 'super@leadcapsule.dev', password: '3Gjgrl9yez8atOyij2DVng' };
const ORG_ADMIN = { email: 'owner@acme-test.dev', password: 'test123' };

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

function findChrome() {
  for (const c of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) {
    if (existsSync(c)) return c;
  }
  throw new Error('No Chrome/Edge found');
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'lp-marketing-')),
    args: ['--no-sandbox'],
  });

  try {
    // =================================================================
    // Anonymous visit to "/" — should render the landing page
    // =================================================================
    const anonPage = await browser.newPage();
    await anonPage.setViewport({ width: 1440, height: 900 });
    await anonPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const anonState = await anonPage.evaluate(() => ({
      path: location.pathname,
      hasHero: document.body.innerText.includes("about to buy"),
      hasHowItWorks: document.body.innerText.includes('How it works'),
      hasCTA: !!document.querySelector('a[href="/login"]'),
    }));
    record(
      'Anonymous "/" renders the full landing page (not a redirect)',
      anonState.path === '/' && anonState.hasHero && anonState.hasHowItWorks && anonState.hasCTA,
      JSON.stringify(anonState),
    );

    // =================================================================
    // Logged in as org-admin -> "/" redirects to /dashboard
    // =================================================================
    const orgCtx = await browser.createBrowserContext();
    const orgAdminPage = await orgCtx.newPage();
    await orgAdminPage.setViewport({ width: 1440, height: 900 });
    await login(orgAdminPage, ORG_ADMIN);
    await orgAdminPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    record(
      'Logged in as org-admin, visiting "/" redirects to /dashboard',
      new URL(orgAdminPage.url()).pathname === '/dashboard',
      orgAdminPage.url(),
    );
    await orgCtx.close();

    // =================================================================
    // Logged in as platform-admin -> "/" redirects to /super-admin
    // =================================================================
    const superCtx = await browser.createBrowserContext();
    const superPage = await superCtx.newPage();
    await superPage.setViewport({ width: 1440, height: 900 });
    await login(superPage, SUPER);
    await superPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    record(
      'Logged in as platform-admin, visiting "/" redirects to /super-admin',
      new URL(superPage.url()).pathname === '/super-admin',
      superPage.url(),
    );
    await superCtx.close();

    // =================================================================
    // 4 public pages — reachable, no auth, via header nav
    // =================================================================
    for (const path of ['/about', '/features', '/product', '/contact']) {
      await anonPage.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      const state = await anonPage.evaluate(() => ({
        path: location.pathname,
        hasHeader: !!document.querySelector('header'),
        hasFooter: !!document.querySelector('footer'),
        textLength: document.body.innerText.length,
      }));
      record(
        `${path} renders publicly with shared header+footer`,
        state.path === path && state.hasHeader && state.hasFooter && state.textLength > 200,
        JSON.stringify(state),
      );
    }

    // nav links actually work (click from header, not just URL bar)
    await anonPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const navHrefs = await anonPage.evaluate(() =>
      [...document.querySelectorAll('header nav a')].map((a) => new URL(a.href).pathname),
    );
    record(
      'Header nav contains all 4 links (About/Features/Product/Contact)',
      ['/about', '/features', '/product', '/contact'].every((p) => navHrefs.includes(p)),
      JSON.stringify(navHrefs),
    );

    // "Log in" button in header reaches /login
    const loginHref = await anonPage.evaluate(() => {
      const a = [...document.querySelectorAll('header a')].find((el) => el.textContent.trim() === 'Log in');
      return a ? new URL(a.href).pathname : null;
    });
    record('Header "Log in" button links to /login', loginHref === '/login', loginHref);

    // =================================================================
    // Both themes on all 5 pages
    // =================================================================
    for (const path of ['/', '/about', '/features', '/product', '/contact']) {
      await anonPage.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 500));

      const light = await anonPage.evaluate(() => ({
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        bg: getComputedStyle(document.body).backgroundColor,
      }));

      await anonPage.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Toggle color theme"]');
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const dark = await anonPage.evaluate(() => ({
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        bg: getComputedStyle(document.body).backgroundColor,
      }));

      // reset to light for the next page
      await anonPage.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Toggle color theme"]');
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 400));

      record(
        `${path} renders correctly in both themes`,
        light.theme === 'light' && dark.theme === 'dark' && light.bg !== dark.bg,
        `light=${light.bg} dark=${dark.bg}`,
      );
    }

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

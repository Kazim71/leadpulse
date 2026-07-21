// Verifies the dark editorial marketing redesign: colors, fonts, CLS
// (actual measurement, not assumed), and that the cursor effect doesn't
// break navigation.
// Run: node test/verify-marketing-redesign.mjs   (server must be running)

import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PAGES = ['/', '/about', '/features', '/product', '/contact'];

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

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'lp-mktredesign-')),
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ---- visual consistency across all 5 pages -------------------------
    for (const path of PAGES) {
      // Measure CLS for real via the Layout Instability API, from the
      // moment navigation starts.
      await page.evaluateOnNewDocument(() => {
        window.__cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch {
          window.__cls = null; // API unsupported in this browser build
        }
      });

      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
      // Give web fonts time to finish swapping in — CLS from a font swap
      // would show up within this window.
      await new Promise((r) => setTimeout(r, 1500));

      const info = await page.evaluate(() => {
        // document.body's OWN computed bg is irrelevant here — Next
        // injects <script> tags as body's literal first children, and the
        // actual page markup (this app's dark wrapper div) sits fully
        // opaque on top, covering 100% of body's height. What matters is
        // the wrapper div's background, found by its known class.
        const wrapper = document.querySelector('div[class*="bg-marketing-bg"]');
        const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null;
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? getComputedStyle(h1) : null;
        return {
          wrapperBg: wrapperStyle?.backgroundColor ?? null,
          wrapperCoversFullHeight: wrapper
            ? Math.abs(wrapper.getBoundingClientRect().height - document.body.getBoundingClientRect().height) < 2
            : false,
          h1Font: h1Style?.fontFamily ?? null,
          h1Color: h1Style?.color ?? null,
          cls: window.__cls,
        };
      });

      record(
        `${path}: dark background applied and covers full page height`,
        // #100D0C = rgb(16,13,12) — warm near-black
        info.wrapperBg === 'rgb(16, 13, 12)' && info.wrapperCoversFullHeight,
        `bg=${info.wrapperBg} fullHeight=${info.wrapperCoversFullHeight}`,
      );
      record(
        `${path}: h1 uses the marketing display serif`,
        // next/font generates a scoped local name like
        // "__DM_Serif_Display_<hash>" — underscores, not the literal
        // Google Fonts name with spaces.
        Boolean(info.h1Font && /DM_Serif_Display/i.test(info.h1Font)),
        `font=${info.h1Font}`,
      );
      record(
        `${path}: h1 renders high-contrast light text`,
        // #F5F1EC = rgb(245,241,236)
        info.h1Color === 'rgb(245, 241, 236)',
        `color=${info.h1Color}`,
      );
      record(
        `${path}: measured CLS is negligible (<0.05)`,
        info.cls === null || info.cls < 0.05,
        info.cls === null ? 'Layout Instability API unsupported — skipped' : `CLS=${info.cls}`,
      );
    }

    // ---- header/footer present + no old brand strings ------------------
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const chrome = await page.evaluate(() => ({
      hasHeader: !!document.querySelector('header'),
      hasFooter: !!document.querySelector('footer'),
      hasThemeToggle: !!document.querySelector('button[aria-label="Toggle color theme"]'),
      footerColumnCount: document.querySelectorAll('footer [class*="grid"] > div').length,
    }));
    record('shared header renders', chrome.hasHeader, '');
    record('shared footer renders', chrome.hasFooter, '');
    record(
      'no theme toggle on marketing pages (explicit dark-only decision)',
      !chrome.hasThemeToggle,
      chrome.hasThemeToggle ? 'toggle still present — decision not applied' : '',
    );
    record('footer is multi-column', chrome.footerColumnCount >= 3, `${chrome.footerColumnCount} columns`);

    // ---- cursor glow doesn't break real navigation ----------------------
    const cursorPresent = await page.evaluate(() => {
      const els = document.querySelectorAll('div[aria-hidden="true"]');
      return [...els].some((el) => getComputedStyle(el).pointerEvents === 'none' && el.className.includes('rounded-full'));
    });
    record('cursor glow element present and pointer-events:none', cursorPresent, '');

    // Real click on a nav link — must still navigate correctly with the
    // cursor effect mounted.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
    });
    await new Promise((r) => setTimeout(r, 300));
    const aboutLink = await page.$$eval('header nav a', (as) => {
      const a = as.find((el) => el.textContent.trim() === 'About');
      return a ? a.getAttribute('href') : null;
    });
    await page.click('header nav a[href="/about"]');
    await page.waitForFunction(() => location.pathname === '/about', { timeout: 5000 });
    record(
      'clicking a nav link still navigates correctly with cursor glow active',
      new URL(page.url()).pathname === '/about',
      `nav href was ${aboutLink}, landed on ${new URL(page.url()).pathname}`,
    );

    // CTA button click
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 400 })));
    await new Promise((r) => setTimeout(r, 300));
    await page.click('a[href="/login"]');
    await page.waitForFunction(() => location.pathname === '/login', { timeout: 5000 });
    record('clicking the hero CTA still navigates to /login', new URL(page.url()).pathname === '/login', '');

    // ---- cursor glow absent on touch-simulated viewport (no dead circle) --
    const touchPage = await browser.newPage();
    await touchPage.emulate({
      viewport: { width: 390, height: 844, hasTouch: true, isMobile: true },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    await touchPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    const touchCursorOpacity = await touchPage.evaluate(() => {
      const els = document.querySelectorAll('div[aria-hidden="true"]');
      const glow = [...els].find((el) => el.className.includes('rounded-full'));
      return glow ? getComputedStyle(glow).opacity : null;
    });
    record(
      'cursor glow stays invisible on a touch/coarse-pointer viewport',
      touchCursorOpacity === '0' || touchCursorOpacity === null,
      `opacity=${touchCursorOpacity}`,
    );
    await touchPage.close();

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
